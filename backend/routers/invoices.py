# Invoice Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from fastapi.responses import FileResponse
from typing import Optional, Dict, List
from datetime import datetime, timezone
import uuid
import io
import httpx

# PDF generation imports
from reportlab.lib.pagesizes import A4, A5
from reportlab.lib import colors
from reportlab.lib.units import mm, inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.barcode import code128

# Barcode generation
import barcode
from barcode.writer import ImageWriter

router = APIRouter(tags=["Invoices"])

db = None
require_admin = None
get_current_user = None
UPLOAD_DIR = None

# Indian states with codes
INDIAN_STATES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman and Diu", "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra", "28": "Andhra Pradesh (Old)", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands",
    "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
}

def init_router(database, admin_checker, user_getter, upload_dir):
    global db, require_admin, get_current_user, UPLOAD_DIR
    db = database
    require_admin = admin_checker
    get_current_user = user_getter
    UPLOAD_DIR = upload_dir

def get_state_code(state_name: str) -> str:
    """Get state code from state name"""
    state_name_lower = state_name.lower().strip()
    for code, name in INDIAN_STATES.items():
        if name.lower() == state_name_lower or state_name_lower in name.lower():
            return code
    return "99"  # Default for other territory

def number_to_words(num: float) -> str:
    """Convert number to words in Indian format"""
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    def convert_chunk(n):
        if n < 20:
            return ones[n]
        elif n < 100:
            return tens[n // 10] + (' ' + ones[n % 10] if n % 10 else '')
        else:
            return ones[n // 100] + ' Hundred' + (' and ' + convert_chunk(n % 100) if n % 100 else '')
    
    num = int(round(num))
    if num == 0:
        return 'Zero Rupees Only'
    
    crore = num // 10000000
    lakh = (num % 10000000) // 100000
    thousand = (num % 100000) // 1000
    hundred = num % 1000
    
    parts = []
    if crore:
        parts.append(convert_chunk(crore) + ' Crore')
    if lakh:
        parts.append(convert_chunk(lakh) + ' Lakh')
    if thousand:
        parts.append(convert_chunk(thousand) + ' Thousand')
    if hundred:
        parts.append(convert_chunk(hundred))
    
    return ' '.join(parts) + ' Rupees Only'

async def calculate_gst(items: List[Dict], customer_state: str, gst_settings: Dict) -> Dict:
    """Calculate GST for order items"""
    seller_state = gst_settings.get("business_state", "Rajasthan")
    is_inter_state = customer_state.lower().strip() != seller_state.lower().strip()
    
    calculated_items = []
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    total_taxable = 0
    
    for item in items:
        product = await db.products.find_one({"product_id": item["product_id"]})
        
        gst_rate = item.get("gst_rate") or (product.get("gst_rate") if product else None) or gst_settings.get("default_gst_rate", 18)
        hsn_code = item.get("hsn_code") or (product.get("hsn_code") if product else None) or ""
        
        unit_price = item.get("price", product.get("price", 0) if product else 0)
        quantity = item.get("quantity", 1)
        item_total = unit_price * quantity
        
        # Calculate taxable amount (price includes GST)
        taxable_amount = item_total / (1 + gst_rate / 100)
        gst_amount = item_total - taxable_amount
        
        if is_inter_state:
            igst = gst_amount
            cgst = sgst = 0
            total_igst += igst
        else:
            cgst = sgst = gst_amount / 2
            igst = 0
            total_cgst += cgst
            total_sgst += sgst
        
        total_taxable += taxable_amount
        
        calculated_items.append({
            "product_id": item["product_id"],
            "product_name": item.get("product_name", product.get("name", "Product") if product else "Product"),
            "hsn_code": hsn_code,
            "quantity": quantity,
            "unit_price": round(unit_price, 2),
            "gst_rate": gst_rate,
            "taxable_amount": round(taxable_amount, 2),
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "igst": round(igst, 2),
            "total": round(item_total, 2),
            "size": item.get("selected_size"),
            "color": item.get("selected_color")
        })
    
    return {
        "items": calculated_items,
        "taxable_amount": round(total_taxable, 2),
        "cgst_amount": round(total_cgst, 2),
        "sgst_amount": round(total_sgst, 2),
        "igst_amount": round(total_igst, 2),
        "total_gst": round(total_cgst + total_sgst + total_igst, 2),
        "is_inter_state": is_inter_state
    }

async def generate_invoice_number() -> str:
    """Generate unique invoice number"""
    prefix = "PC"
    year = datetime.now().strftime("%y")
    
    # Get count for current financial year
    count = await db.invoices.count_documents({}) + 1
    
    return f"{prefix}/{year}/{str(count).zfill(5)}"

@router.get("/orders/{order_id}/invoice")
async def get_or_generate_invoice(
    order_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get or generate invoice for an order"""
    existing_invoice = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if existing_invoice:
        return existing_invoice
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["payment_status"] not in ["paid", "completed"] and order["status"] not in ["confirmed", "processing", "shipped", "delivered"]:
        raise HTTPException(status_code=400, detail="Invoice can only be generated for confirmed/paid orders")
    
    gst_settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    if not gst_settings:
        gst_settings = {
            "business_name": "Paridhaan Creations",
            "gstin": "08BFVPG3792N1ZH",
            "business_address": "Terra City 1, Tijara, 301411",
            "business_state": "Rajasthan",
            "business_state_code": "08",
            "default_gst_rate": 18.0,
            "prices_include_gst": True,
            "invoice_prefix": "PC"
        }
    
    customer_state = order["shipping_address"]["state"]
    gst_calc = await calculate_gst(order["items"], customer_state, gst_settings)
    
    invoice_number = await generate_invoice_number()
    
    subtotal = sum(item["price"] * item["quantity"] for item in order["items"])
    discount = order.get("discount_amount", 0)
    
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "invoice_number": invoice_number,
        "order_id": order_id,
        "seller_name": gst_settings.get("business_name", "Paridhaan Creations"),
        "seller_gstin": gst_settings.get("gstin", ""),
        "seller_address": gst_settings.get("business_address", ""),
        "seller_state": gst_settings.get("business_state", "Rajasthan"),
        "seller_state_code": gst_settings.get("business_state_code", "08"),
        "seller_phone": gst_settings.get("business_phone", ""),
        "seller_email": gst_settings.get("business_email", ""),
        "buyer_name": order["shipping_address"]["full_name"],
        "buyer_address": f"{order['shipping_address']['address_line1']}, {order['shipping_address'].get('address_line2', '')} {order['shipping_address']['city']}, {order['shipping_address']['state']} - {order['shipping_address']['pincode']}".replace(", ,", ","),
        "buyer_state": customer_state,
        "buyer_state_code": get_state_code(customer_state),
        "buyer_gstin": order["shipping_address"].get("gstin"),
        "buyer_phone": order["shipping_address"]["phone"],
        "buyer_email": order.get("guest_email"),
        "items": gst_calc["items"],
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "taxable_amount": gst_calc["taxable_amount"],
        "cgst_amount": gst_calc["cgst_amount"],
        "sgst_amount": gst_calc["sgst_amount"],
        "igst_amount": gst_calc["igst_amount"],
        "total_gst": gst_calc["total_gst"],
        "grand_total": round(order["total_amount"], 2),
        "amount_in_words": number_to_words(order["total_amount"]),
        "is_inter_state": gst_calc["is_inter_state"],
        "payment_method": order["payment_method"],
        "payment_status": order["payment_status"],
        "bank_name": gst_settings.get("bank_name"),
        "bank_account_number": gst_settings.get("bank_account_number"),
        "bank_ifsc": gst_settings.get("bank_ifsc"),
        "invoice_footer_text": gst_settings.get("invoice_footer_text", "Thank you for shopping with us!"),
        "terms_and_conditions": gst_settings.get("terms_and_conditions"),
        "authorized_signatory": gst_settings.get("authorized_signatory"),
        "invoice_date": datetime.now(timezone.utc).isoformat(),
        "order_date": order["created_at"] if isinstance(order["created_at"], str) else order["created_at"].isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.insert_one(invoice)
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "invoice_number": invoice_number,
            "invoice_generated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return invoice

@router.get("/orders/{order_id}/invoice/pdf")
async def generate_invoice_pdf(order_id: str):
    """Generate and download invoice PDF"""
    invoice = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if not invoice:
        invoice = await get_or_generate_invoice(order_id, None, None)
    
    pdf_filename = f"invoice_{invoice['invoice_number'].replace('/', '_')}.pdf"
    pdf_path = UPLOAD_DIR / pdf_filename
    
    # Create PDF
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, alignment=TA_CENTER, spaceAfter=20, textColor=colors.HexColor('#8B4513'))
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9)
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold')
    right_style = ParagraphStyle('Right', parent=styles['Normal'], fontSize=9, alignment=TA_RIGHT)
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=colors.grey)
    
    def fmt_amt(amount):
        return f"Rs.{amount:.2f}"
    
    # Header
    elements.append(Paragraph("TAX INVOICE", title_style))
    elements.append(Spacer(1, 10))
    
    # Invoice info
    invoice_date_str = invoice['invoice_date'][:10] if isinstance(invoice['invoice_date'], str) else invoice['invoice_date'].strftime('%Y-%m-%d')
    order_date_str = invoice['order_date'][:10] if isinstance(invoice['order_date'], str) else invoice['order_date'].strftime('%Y-%m-%d')
    
    invoice_info = [
        [Paragraph(f"<b>Invoice No:</b> {invoice['invoice_number']}", normal_style),
         Paragraph(f"<b>Invoice Date:</b> {invoice_date_str}", right_style)],
        [Paragraph(f"<b>Order ID:</b> {invoice['order_id']}", normal_style),
         Paragraph(f"<b>Order Date:</b> {order_date_str}", right_style)]
    ]
    invoice_table = Table(invoice_info, colWidths=[280, 250])
    invoice_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    elements.append(invoice_table)
    elements.append(Spacer(1, 15))
    
    # Seller and Buyer
    seller_buyer_data = [
        [Paragraph("<b>SELLER DETAILS</b>", bold_style), Paragraph("<b>BUYER DETAILS</b>", bold_style)],
        [Paragraph(f"<b>{invoice['seller_name']}</b>", normal_style), Paragraph(f"<b>{invoice['buyer_name']}</b>", normal_style)],
        [Paragraph(f"GSTIN: {invoice['seller_gstin']}", normal_style), Paragraph(f"GSTIN: {invoice.get('buyer_gstin') or 'N/A'}", normal_style)],
        [Paragraph(f"{invoice['seller_address']}", normal_style), Paragraph(f"{invoice['buyer_address']}", normal_style)],
        [Paragraph(f"State: {invoice['seller_state']} ({invoice['seller_state_code']})", normal_style), Paragraph(f"State: {invoice['buyer_state']} ({invoice['buyer_state_code']})", normal_style)],
        [Paragraph(f"Phone: {invoice.get('seller_phone') or ''}", normal_style), Paragraph(f"Phone: {invoice.get('buyer_phone') or ''}", normal_style)],
    ]
    
    seller_buyer_table = Table(seller_buyer_data, colWidths=[265, 265])
    seller_buyer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5f5f5')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(seller_buyer_table)
    elements.append(Spacer(1, 15))
    
    # Items
    is_inter_state = invoice.get("is_inter_state", False)
    if is_inter_state:
        items_header = ['S.No', 'Item Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'IGST%', 'IGST', 'Total']
        col_widths = [30, 130, 50, 35, 50, 55, 40, 45, 55]
    else:
        items_header = ['S.No', 'Item Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'CGST%', 'CGST', 'SGST', 'Total']
        col_widths = [25, 115, 45, 30, 45, 50, 35, 40, 40, 50]
    
    items_data = [items_header]
    
    for idx, item in enumerate(invoice['items'], 1):
        item_desc = item['product_name'][:25]
        item_extras = []
        if item.get('size'):
            item_extras.append(f"Size: {item['size']}")
        if item.get('color'):
            item_extras.append(f"Color: {item['color']}")
        if item_extras:
            item_desc = f"{item_desc}\n({', '.join(item_extras)})"
        
        if is_inter_state:
            row = [str(idx), item_desc, item.get('hsn_code', ''), str(item['quantity']),
                   fmt_amt(item['unit_price']), fmt_amt(item['taxable_amount']),
                   f"{item['gst_rate']}%", fmt_amt(item['igst']), fmt_amt(item['total'])]
        else:
            row = [str(idx), item_desc, item.get('hsn_code', ''), str(item['quantity']),
                   fmt_amt(item['unit_price']), fmt_amt(item['taxable_amount']),
                   f"{item['gst_rate']/2}%", fmt_amt(item['cgst']), fmt_amt(item['sgst']), fmt_amt(item['total'])]
        items_data.append(row)
    
    items_table = Table(items_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B4513')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))
    
    # Summary
    summary_data = [['Subtotal:', fmt_amt(invoice['subtotal'])]]
    if invoice.get('discount', 0) > 0:
        summary_data.append(['Discount:', f"-{fmt_amt(invoice['discount'])}"])
    summary_data.append(['Taxable Amount:', fmt_amt(invoice['taxable_amount'])])
    
    if is_inter_state:
        summary_data.append(["IGST:", fmt_amt(invoice['igst_amount'])])
    else:
        summary_data.append(["CGST:", fmt_amt(invoice['cgst_amount'])])
        summary_data.append(["SGST:", fmt_amt(invoice['sgst_amount'])])
    
    summary_data.append(['Total GST:', fmt_amt(invoice['total_gst'])])
    summary_data.append(['', ''])
    summary_data.append([Paragraph('<b>GRAND TOTAL:</b>', bold_style), Paragraph(f"<b>{fmt_amt(invoice['grand_total'])}</b>", bold_style)])
    
    summary_table = Table(summary_data, colWidths=[380, 150])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 10))
    
    # Amount in words
    elements.append(Paragraph(f"<b>Amount in Words:</b> {invoice['amount_in_words']}", normal_style))
    elements.append(Spacer(1, 20))
    
    # Return address
    return_address = f"""
    <b>IF UNDELIVERED, PLEASE RETURN TO:</b><br/>
    {invoice['seller_name']}<br/>
    {invoice['seller_address']}<br/>
    State: {invoice['seller_state']} ({invoice['seller_state_code']})<br/>
    {f"Phone: {invoice.get('seller_phone')}" if invoice.get('seller_phone') else ""}
    """
    return_box_data = [[Paragraph(return_address, small_style)]]
    return_box = Table(return_box_data, colWidths=[530])
    return_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#B22222')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF5F5')),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(return_box)
    elements.append(Spacer(1, 15))
    
    # Footer
    if invoice.get('invoice_footer_text'):
        elements.append(Paragraph(f"<i>{invoice['invoice_footer_text']}</i>", header_style))
    elements.append(Paragraph("This is a computer generated invoice and does not require a physical signature.", header_style))
    
    # Build PDF
    doc.build(elements)
    
    await db.invoices.update_one(
        {"order_id": order_id},
        {"$set": {"pdf_path": f"/api/uploads/{pdf_filename}"}}
    )
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_filename,
        headers={"Content-Disposition": f"attachment; filename={pdf_filename}"}
    )

@router.get("/admin/invoices")
async def list_invoices(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    limit: int = 50,
    skip: int = 0
):
    """List all invoices (admin)"""
    await require_admin(authorization, session_token)
    
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.invoices.count_documents({})
    
    return {"invoices": invoices, "total": total}

@router.get("/indian-states")
async def get_indian_states():
    """Get list of Indian states with codes"""
    return [{"code": code, "name": name} for code, name in INDIAN_STATES.items()]

@router.get("/gst-settings")
async def get_gst_settings(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get GST settings"""
    settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    if not settings:
        settings = {
            "setting_id": "gst_settings",
            "business_name": "Paridhaan Creations",
            "gstin": "08BFVPG3792N1ZH",
            "business_address": "Terra City 1, Tijara, 301411",
            "business_state": "Rajasthan",
            "business_state_code": "08",
            "default_gst_rate": 18.0,
            "gst_enabled": True,
            "prices_include_gst": True
        }
        await db.gst_settings.insert_one(settings)
    return settings

@router.put("/admin/gst-settings")
async def update_gst_settings(
    updates: dict,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update GST settings (admin)"""
    await require_admin(authorization, session_token)
    
    update_dict = {k: v for k, v in updates.items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.gst_settings.update_one(
        {"setting_id": "gst_settings"},
        {"$set": update_dict},
        upsert=True
    )
    
    settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    return settings

# ==================== COMBINED SHIPPING + INVOICE PDF ====================

def generate_barcode_image(awb_number: str, output_path: str):
    """Generate Code128 barcode image for AWB number"""
    Code128 = barcode.get_barcode_class('code128')
    code = Code128(awb_number, writer=ImageWriter())
    code.save(output_path.replace('.png', ''), options={
        'module_width': 0.4,
        'module_height': 15,
        'font_size': 10,
        'text_distance': 5,
        'quiet_zone': 2
    })
    return output_path

def create_shipping_label_page(canvas, doc, order, shipment, invoice, gst_settings):
    """Create shipping label page with barcode"""
    width, height = A4
    
    # Background
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1)
    
    # Header - Company Info
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.rect(20, height - 80, width - 40, 60, fill=1)
    
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawCentredString(width/2, height - 45, "PARIDHAAN CREATIONS")
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(width/2, height - 60, gst_settings.get("business_address", "Terra City 1, Tijara, 301411"))
    canvas.drawCentredString(width/2, height - 72, f"GSTIN: {gst_settings.get('gstin', '08BFVPG3792N1ZH')}")
    
    # Shipping Label Title
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawCentredString(width/2, height - 105, "SHIPPING LABEL / मालवाहक पर्ची")
    
    y_pos = height - 130
    
    # Order & AWB Info Box
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(2)
    canvas.rect(30, y_pos - 80, width - 60, 75, stroke=1, fill=0)
    
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(40, y_pos - 20, f"Order ID: {order.get('order_id', 'N/A')}")
    canvas.drawString(40, y_pos - 35, f"Order Date: {order.get('created_at', '')[:10] if order.get('created_at') else 'N/A'}")
    canvas.drawString(40, y_pos - 50, f"Invoice No: {invoice.get('invoice_number', 'N/A')}")
    
    awb_number = shipment.get('awb_number', '')
    courier_name = shipment.get('courier_name', 'N/A')
    
    canvas.drawRightString(width - 40, y_pos - 20, f"AWB: {awb_number}")
    canvas.drawRightString(width - 40, y_pos - 35, f"Courier: {courier_name}")
    canvas.drawRightString(width - 40, y_pos - 50, f"Weight: {order.get('total_weight', 0.5)} kg")
    
    # Payment Status
    payment_method = order.get('payment_method', 'Prepaid').upper()
    canvas.setFillColor(colors.HexColor('#228B22') if payment_method == 'PREPAID' else colors.HexColor('#FF4500'))
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawCentredString(width/2, y_pos - 68, f"PAYMENT: {payment_method}")
    canvas.setFillColor(colors.black)
    
    y_pos -= 100
    
    # AWB Barcode Section
    if awb_number:
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawCentredString(width/2, y_pos, "AWB BARCODE")
        
        # Generate barcode
        try:
            barcode_path = str(UPLOAD_DIR / f"barcode_{awb_number}")
            generate_barcode_image(awb_number, barcode_path + ".png")
            
            # Draw barcode image
            barcode_img_path = barcode_path + ".png"
            canvas.drawImage(barcode_img_path, width/2 - 100, y_pos - 80, width=200, height=60)
        except Exception as e:
            # Fallback: Draw text-based barcode representation
            canvas.setFont("Courier-Bold", 14)
            canvas.drawCentredString(width/2, y_pos - 40, f"*{awb_number}*")
        
        y_pos -= 100
    
    # Ship To (Buyer) Section
    canvas.setStrokeColor(colors.HexColor('#8B4513'))
    canvas.setLineWidth(2)
    canvas.rect(30, y_pos - 130, (width - 70)/2, 125, stroke=1, fill=0)
    
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.rect(30, y_pos - 5, (width - 70)/2, 22, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(40, y_pos - 0, "SHIP TO / प्राप्तकर्ता")
    
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 10)
    shipping = order.get('shipping_address', {})
    
    canvas.drawString(40, y_pos - 30, shipping.get('full_name', 'N/A')[:35])
    canvas.setFont("Helvetica", 9)
    
    addr_line1 = shipping.get('address_line1', '')[:40]
    addr_line2 = shipping.get('address_line2', '')[:40] if shipping.get('address_line2') else ''
    city_state = f"{shipping.get('city', '')}, {shipping.get('state', '')}"
    pincode = shipping.get('pincode', '')
    phone = shipping.get('phone', '')
    
    canvas.drawString(40, y_pos - 45, addr_line1)
    if addr_line2:
        canvas.drawString(40, y_pos - 58, addr_line2)
        canvas.drawString(40, y_pos - 71, city_state)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawString(40, y_pos - 88, f"PIN: {pincode}")
        canvas.setFont("Helvetica", 9)
        canvas.drawString(40, y_pos - 103, f"Phone: {phone}")
    else:
        canvas.drawString(40, y_pos - 58, city_state)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawString(40, y_pos - 75, f"PIN: {pincode}")
        canvas.setFont("Helvetica", 9)
        canvas.drawString(40, y_pos - 92, f"Phone: {phone}")
    
    # Ship From (Seller) Section
    canvas.setStrokeColor(colors.HexColor('#8B4513'))
    canvas.rect(width/2 + 5, y_pos - 130, (width - 70)/2, 125, stroke=1, fill=0)
    
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.rect(width/2 + 5, y_pos - 5, (width - 70)/2, 22, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(width/2 + 15, y_pos - 0, "SHIP FROM / प्रेषक")
    
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(width/2 + 15, y_pos - 30, gst_settings.get('business_name', 'Paridhaan Creations')[:35])
    canvas.setFont("Helvetica", 9)
    canvas.drawString(width/2 + 15, y_pos - 45, gst_settings.get('business_address', '')[:40])
    canvas.drawString(width/2 + 15, y_pos - 58, f"{gst_settings.get('business_state', 'Rajasthan')}")
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(width/2 + 15, y_pos - 75, f"PIN: 301411")
    canvas.setFont("Helvetica", 9)
    canvas.drawString(width/2 + 15, y_pos - 92, f"GSTIN: {gst_settings.get('gstin', '')}")
    
    y_pos -= 150
    
    # Product Summary Table
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(30, y_pos, "PRODUCT DETAILS / उत्पाद विवरण")
    
    y_pos -= 15
    
    # Table header
    canvas.setFillColor(colors.HexColor('#f5f5f5'))
    canvas.rect(30, y_pos - 20, width - 60, 20, fill=1)
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(35, y_pos - 15, "S.No")
    canvas.drawString(60, y_pos - 15, "Product Name")
    canvas.drawString(350, y_pos - 15, "Qty")
    canvas.drawString(400, y_pos - 15, "Price")
    canvas.drawString(470, y_pos - 15, "Total")
    
    y_pos -= 25
    canvas.setFont("Helvetica", 9)
    
    items = order.get('items', [])
    for idx, item in enumerate(items[:6], 1):  # Max 6 items on label
        canvas.drawString(35, y_pos, str(idx))
        product_name = item.get('product_name', 'Product')[:40]
        if item.get('selected_size'):
            product_name += f" ({item['selected_size']})"
        canvas.drawString(60, y_pos, product_name)
        canvas.drawString(350, y_pos, str(item.get('quantity', 1)))
        canvas.drawString(400, y_pos, f"Rs.{item.get('price', 0):.0f}")
        canvas.drawString(470, y_pos, f"Rs.{item.get('price', 0) * item.get('quantity', 1):.0f}")
        y_pos -= 15
    
    if len(items) > 6:
        canvas.drawString(60, y_pos, f"... and {len(items) - 6} more items")
        y_pos -= 15
    
    # Total Amount
    y_pos -= 10
    canvas.setStrokeColor(colors.black)
    canvas.line(30, y_pos, width - 30, y_pos)
    y_pos -= 20
    
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(350, y_pos, "TOTAL AMOUNT:")
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.drawString(470, y_pos, f"Rs.{order.get('total_amount', 0):.2f}")
    canvas.setFillColor(colors.black)
    
    # Footer - Return Address
    y_pos = 80
    canvas.setStrokeColor(colors.HexColor('#B22222'))
    canvas.setLineWidth(1)
    canvas.rect(30, 20, width - 60, 55, stroke=1, fill=0)
    
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(colors.HexColor('#B22222'))
    canvas.drawString(40, y_pos - 15, "IF UNDELIVERED, RETURN TO / वापसी का पता:")
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(40, y_pos - 30, f"{gst_settings.get('business_name', 'Paridhaan Creations')}, {gst_settings.get('business_address', '')}")
    canvas.drawString(40, y_pos - 42, f"State: {gst_settings.get('business_state', 'Rajasthan')} - 301411 | GSTIN: {gst_settings.get('gstin', '')}")

@router.get("/orders/{order_id}/combined-pdf")
async def generate_combined_shipping_invoice_pdf(
    order_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Generate combined PDF with Shipping Label (Page 1) + Tax Invoice (Page 2)"""
    from reportlab.pdfgen import canvas as pdf_canvas
    from pathlib import Path
    
    # Get order
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get shipment
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found. Please create shipment first.")
    
    # Get or generate invoice
    invoice = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if not invoice:
        # Generate invoice if not exists
        invoice = await get_or_generate_invoice(order_id, authorization, session_token)
    
    # Get GST settings
    gst_settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    if not gst_settings:
        gst_settings = {
            "business_name": "Paridhaan Creations",
            "gstin": "08BFVPG3792N1ZH",
            "business_address": "Terra City 1, Tijara, 301411",
            "business_state": "Rajasthan",
            "business_state_code": "08"
        }
    
    # Generate combined PDF
    pdf_filename = f"combined_{order_id}_{shipment.get('awb_number', 'NA')}.pdf"
    pdf_path = UPLOAD_DIR / pdf_filename
    
    width, height = A4
    c = pdf_canvas.Canvas(str(pdf_path), pagesize=A4)
    
    # Page 1: Shipping Label
    create_shipping_label_page(c, None, order, shipment, invoice, gst_settings)
    c.showPage()
    
    # Page 2: Tax Invoice (simplified version on canvas)
    create_tax_invoice_page(c, order, invoice, gst_settings)
    c.showPage()
    
    c.save()
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_filename,
        headers={"Content-Disposition": f"attachment; filename={pdf_filename}"}
    )

def create_tax_invoice_page(canvas, order, invoice, gst_settings):
    """Create tax invoice page"""
    width, height = A4
    
    # Header
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.rect(20, height - 70, width - 40, 50, fill=1)
    
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 20)
    canvas.drawCentredString(width/2, height - 50, "TAX INVOICE / कर बीजक")
    
    y_pos = height - 90
    
    # Invoice Info
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(30, y_pos, f"Invoice No: {invoice.get('invoice_number', 'N/A')}")
    canvas.drawString(30, y_pos - 15, f"Invoice Date: {invoice.get('invoice_date', '')[:10] if invoice.get('invoice_date') else 'N/A'}")
    canvas.drawRightString(width - 30, y_pos, f"Order ID: {order.get('order_id', 'N/A')}")
    canvas.drawRightString(width - 30, y_pos - 15, f"Order Date: {order.get('created_at', '')[:10] if order.get('created_at') else 'N/A'}")
    
    y_pos -= 40
    
    # Seller & Buyer boxes
    box_width = (width - 70) / 2
    
    # Seller Box
    canvas.setStrokeColor(colors.black)
    canvas.rect(30, y_pos - 100, box_width, 95, stroke=1)
    canvas.setFillColor(colors.HexColor('#f5f5f5'))
    canvas.rect(30, y_pos, box_width, 18, fill=1)
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(35, y_pos + 4, "SELLER DETAILS / विक्रेता विवरण")
    
    canvas.setFont("Helvetica", 9)
    canvas.drawString(35, y_pos - 15, f"Name: {gst_settings.get('business_name', '')}")
    canvas.drawString(35, y_pos - 30, f"GSTIN: {gst_settings.get('gstin', '')}")
    canvas.drawString(35, y_pos - 45, f"Address: {gst_settings.get('business_address', '')}")
    canvas.drawString(35, y_pos - 60, f"State: {gst_settings.get('business_state', '')} ({gst_settings.get('business_state_code', '')})")
    
    # Buyer Box
    canvas.rect(width/2 + 5, y_pos - 100, box_width, 95, stroke=1)
    canvas.setFillColor(colors.HexColor('#f5f5f5'))
    canvas.rect(width/2 + 5, y_pos, box_width, 18, fill=1)
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(width/2 + 10, y_pos + 4, "BUYER DETAILS / क्रेता विवरण")
    
    shipping = order.get('shipping_address', {})
    canvas.setFont("Helvetica", 9)
    canvas.drawString(width/2 + 10, y_pos - 15, f"Name: {shipping.get('full_name', '')}")
    canvas.drawString(width/2 + 10, y_pos - 30, f"Phone: {shipping.get('phone', '')}")
    canvas.drawString(width/2 + 10, y_pos - 45, f"Address: {shipping.get('address_line1', '')[:35]}")
    canvas.drawString(width/2 + 10, y_pos - 60, f"{shipping.get('city', '')}, {shipping.get('state', '')} - {shipping.get('pincode', '')}")
    
    y_pos -= 120
    
    # Items Table Header
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.rect(30, y_pos - 20, width - 60, 20, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    
    col_x = [35, 55, 220, 265, 295, 340, 395, 440, 485, 530]
    headers = ['S.No', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST Amt', 'Total']
    for i, header in enumerate(headers):
        canvas.drawString(col_x[i], y_pos - 15, header)
    
    y_pos -= 25
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica", 8)
    
    items = invoice.get('items', [])
    is_inter_state = invoice.get('is_inter_state', False)
    
    for idx, item in enumerate(items[:10], 1):
        canvas.drawString(col_x[0], y_pos, str(idx))
        canvas.drawString(col_x[1], y_pos, item.get('product_name', '')[:25])
        canvas.drawString(col_x[2], y_pos, item.get('hsn_code', '')[:8])
        canvas.drawString(col_x[3], y_pos, str(item.get('quantity', 1)))
        canvas.drawString(col_x[4], y_pos, f"{item.get('unit_price', 0):.0f}")
        canvas.drawString(col_x[5], y_pos, f"{item.get('taxable_amount', 0):.0f}")
        canvas.drawString(col_x[6], y_pos, f"{item.get('gst_rate', 0)}%")
        gst_amt = item.get('igst', 0) if is_inter_state else (item.get('cgst', 0) + item.get('sgst', 0))
        canvas.drawString(col_x[7], y_pos, f"{gst_amt:.0f}")
        canvas.drawString(col_x[8], y_pos, f"{item.get('total', 0):.0f}")
        y_pos -= 15
    
    y_pos -= 10
    canvas.line(30, y_pos, width - 30, y_pos)
    y_pos -= 20
    
    # Summary
    canvas.setFont("Helvetica", 9)
    summary_x = width - 200
    
    canvas.drawString(summary_x, y_pos, "Subtotal:")
    canvas.drawRightString(width - 35, y_pos, f"Rs.{invoice.get('subtotal', 0):.2f}")
    y_pos -= 15
    
    if invoice.get('discount', 0) > 0:
        canvas.drawString(summary_x, y_pos, "Discount:")
        canvas.drawRightString(width - 35, y_pos, f"-Rs.{invoice.get('discount', 0):.2f}")
        y_pos -= 15
    
    canvas.drawString(summary_x, y_pos, "Taxable Amount:")
    canvas.drawRightString(width - 35, y_pos, f"Rs.{invoice.get('taxable_amount', 0):.2f}")
    y_pos -= 15
    
    if is_inter_state:
        canvas.drawString(summary_x, y_pos, "IGST:")
        canvas.drawRightString(width - 35, y_pos, f"Rs.{invoice.get('igst_amount', 0):.2f}")
    else:
        canvas.drawString(summary_x, y_pos, "CGST:")
        canvas.drawRightString(width - 35, y_pos, f"Rs.{invoice.get('cgst_amount', 0):.2f}")
        y_pos -= 15
        canvas.drawString(summary_x, y_pos, "SGST:")
        canvas.drawRightString(width - 35, y_pos, f"Rs.{invoice.get('sgst_amount', 0):.2f}")
    y_pos -= 20
    
    canvas.setFont("Helvetica-Bold", 11)
    canvas.line(summary_x, y_pos + 5, width - 30, y_pos + 5)
    canvas.drawString(summary_x, y_pos - 10, "GRAND TOTAL:")
    canvas.setFillColor(colors.HexColor('#8B4513'))
    canvas.drawRightString(width - 35, y_pos - 10, f"Rs.{invoice.get('grand_total', 0):.2f}")
    canvas.setFillColor(colors.black)
    
    y_pos -= 35
    
    # Amount in words
    canvas.setFont("Helvetica", 9)
    canvas.drawString(30, y_pos, f"Amount in Words: {invoice.get('amount_in_words', '')}")
    
    y_pos -= 30
    
    # Return Address Footer
    canvas.setStrokeColor(colors.HexColor('#B22222'))
    canvas.rect(30, 30, width - 60, 50, stroke=1)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(colors.HexColor('#B22222'))
    canvas.drawString(40, 65, "IF UNDELIVERED, RETURN TO:")
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(40, 50, f"{gst_settings.get('business_name', '')}, {gst_settings.get('business_address', '')}")
    canvas.drawString(40, 38, f"State: {gst_settings.get('business_state', '')} | GSTIN: {gst_settings.get('gstin', '')}")
    
    # Footer note
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(width/2, 15, "This is a computer generated invoice and does not require a physical signature. राधे राधे 🙏")
