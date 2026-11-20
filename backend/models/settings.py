# Settings Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone

class SiteSettings(BaseModel):
    """Site-wide settings including logos and branding"""
    model_config = ConfigDict(extra="ignore")
    setting_id: str = "site_settings"  # Single document
    header_logo: Optional[str] = None  # Header logo URL
    footer_logo: Optional[str] = None  # Footer logo URL (can be same as header)
    favicon: Optional[str] = None  # Favicon URL
    site_name: str = "Paridhaan Creations"
    tagline: Optional[str] = "Traditional & Handicraft Store"
    primary_color: Optional[str] = "#8B4513"  # Theme color
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    # Return policy settings
    video_required_for_returns: bool = True  # Require video proof for return requests
    return_window_days: int = 7  # Days within which returns are accepted
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    header_logo: Optional[str] = None
    footer_logo: Optional[str] = None
    favicon: Optional[str] = None
    site_name: Optional[str] = None
    tagline: Optional[str] = None
    primary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    video_required_for_returns: Optional[bool] = None
    return_window_days: Optional[int] = None

class GSTSettings(BaseModel):
    """Business GST configuration"""
    model_config = ConfigDict(extra="ignore")
    setting_id: str = "gst_settings"
    business_name: str = "Paridhaan Creations"
    gstin: str = ""  # GSTIN number
    state: str = "Rajasthan"  # Business registered state
    state_code: str = "08"  # State code for GSTIN
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None  # Company Identification Number (if applicable)
    authorized_signatory: Optional[str] = None
    # Invoice settings
    invoice_prefix: str = "PC"
    invoice_sequence: int = 1
    terms_and_conditions: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GSTSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    gstin: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    authorized_signatory: Optional[str] = None
    invoice_prefix: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
