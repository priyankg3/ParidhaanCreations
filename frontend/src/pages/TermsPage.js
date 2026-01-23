import React from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12">
      <SEO 
        title="Terms & Conditions - Paridhaan Creations"
        description="Read our terms and conditions for shopping at Paridhaan Creations. Information about orders, payments, shipping, and returns."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-heading font-bold mb-8" data-testid="terms-title">Terms & Conditions</h1>
        
        <div className="bg-white border border-border/40 p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Paridhaan Creations. By accessing and using our website, you accept and agree to be bound by the terms and conditions outlined below. Please read these terms carefully before using our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">2. Products & Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Paridhaan Creations offers a wide range of traditional Indian products including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Handicrafts and decorative items</li>
              <li>Pooja articles and spiritual items</li>
              <li>Premium perfumes and attars</li>
              <li>Artificial jewellery and accessories</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">3. Orders & Payments</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong>Order Acceptance:</strong> All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason.</p>
              <p><strong>Pricing:</strong> All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.</p>
              <p><strong>Payment Methods:</strong> We accept payments through Razorpay (UPI, Cards, Wallets) and Stripe (International Cards).</p>
              <p><strong>Payment Security:</strong> All payment transactions are encrypted and secure. We do not store your card details.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">4. Shipping & Delivery</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong>Shipping Areas:</strong> We currently ship across India.</p>
              <p><strong>Delivery Time:</strong> Orders are typically processed within 2-3 business days. Delivery may take 5-7 business days depending on your location.</p>
              <p><strong>Shipping Charges:</strong> Shipping charges may apply based on order value and delivery location.</p>
              <p><strong>Order Tracking:</strong> You can track your order status through your account dashboard.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">5. Returns & Refunds</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong>Return Policy:</strong> We accept returns within 7 days of delivery for damaged or defective products.</p>
              <p><strong>Non-Returnable Items:</strong> Perfumes, consumables, and customized products cannot be returned.</p>
              <p><strong>Refund Process:</strong> Approved refunds will be processed within 7-10 business days to your original payment method.</p>
              <p><strong>Return Shipping:</strong> Return shipping costs are borne by the customer unless the product is damaged or defective.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">6. User Account</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials.</p>
              <p><strong>Accurate Information:</strong> You must provide accurate and complete information during registration and checkout.</p>
              <p><strong>Guest Checkout:</strong> You can place orders without creating an account, but creating an account offers benefits like order tracking and faster checkout.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">7. Product Information</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong>Accuracy:</strong> While we strive to provide accurate product descriptions and images, slight variations may occur.</p>
              <p><strong>Availability:</strong> Product availability is subject to change without notice.</p>
              <p><strong>Handcrafted Items:</strong> Handcrafted products may have minor variations as they are made by artisans.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on this website, including text, graphics, logos, images, and software, is the property of Paridhaan Creations and is protected by copyright laws. Unauthorized use is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">9. Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We respect your privacy and are committed to protecting your personal information. We collect and use your data only for order processing, delivery, and improving our services. We do not share your information with third parties except as necessary for order fulfillment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paridhaan Creations shall not be liable for any indirect, incidental, special, or consequential damages arising out of the use or inability to use our products or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">11. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms and conditions at any time. Changes will be effective immediately upon posting on the website. Continued use of the website after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">12. Contact Information</h2>
            <div className="text-muted-foreground leading-relaxed space-y-2">
              <p>If you have any questions about these Terms & Conditions, please contact us:</p>
              <p><strong>Email:</strong> info@paridhaancreations.com</p>
              <p><strong>Phone:</strong> +91 XXXXXXXXXX</p>
              <p><strong>Address:</strong> India</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </section>

          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground italic">
              Last Updated: January 2026
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/products"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-all"
            data-testid="continue-shopping-link"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
