import React from "react";
import { Link } from "react-router-dom";
import { Truck, Package, RefreshCw, Clock, MapPin, Shield, AlertCircle, CheckCircle, ArrowLeftRight } from "lucide-react";
import SEO from "@/components/SEO";

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <SEO 
        title="Shipping, Return & Exchange Policy - Paridhaan Creations"
        description="Free shipping on orders above ₹499. Easy 7-day returns and hassle-free exchanges. Learn about our shipping and return policies."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4" data-testid="shipping-policy-title">
            Shipping, Return & Exchange Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Fast delivery, easy returns, and hassle-free exchanges
          </p>
        </div>
        
        <div className="bg-white border border-border/40 rounded-xl shadow-sm overflow-hidden">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Truck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-semibold">Free Shipping</p>
              <p className="text-xs text-muted-foreground">Above ₹499</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-xs font-semibold">5-7 Days</p>
              <p className="text-xs text-muted-foreground">Delivery Time</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <RefreshCw className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-xs font-semibold">7 Day Returns</p>
              <p className="text-xs text-muted-foreground">Easy Process</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <ArrowLeftRight className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-xs font-semibold">Free Exchange</p>
              <p className="text-xs text-muted-foreground">Same Product</p>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* Shipping Policy */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-500" />
                Shipping Policy
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Free Shipping
                    </h3>
                    <p className="text-sm text-green-700">On all orders above <strong>₹499</strong></p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Standard Shipping
                    </h3>
                    <p className="text-sm text-blue-700">₹49 for orders below ₹499</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold">Delivery Zone</th>
                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold">Estimated Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-sm">Metro Cities (Delhi, Mumbai, Bangalore, etc.)</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 font-medium">3-5 Business Days</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-200 px-4 py-3 text-sm">Tier 2 Cities</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-blue-600 font-medium">5-7 Business Days</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-sm">Remote Areas</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-orange-600 font-medium">7-10 Business Days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <strong>Shipping Partner:</strong> We use Shiprocket for reliable deliveries across India. 
                    You can track your order in real-time through the tracking link sent via SMS/Email.
                  </p>
                </div>
              </div>
            </section>

            {/* Return Policy */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-orange-500" />
                Return Policy
              </h2>
              
              <div className="space-y-4">
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                  <p className="font-semibold text-orange-800">7-Day Return Window</p>
                  <p className="text-sm text-orange-700">Return requests must be initiated within 7 days of delivery</p>
                </div>

                <h3 className="font-semibold mt-6 mb-3">Conditions for Return:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Accepted Returns
                    </h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Product is damaged or defective</li>
                      <li>Wrong product delivered</li>
                      <li>Product missing from package</li>
                      <li>Quality issues with the product</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Non-Returnable Items
                    </h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      <li>Customized/personalized products</li>
                      <li>Items without original tags/packaging</li>
                      <li>Used or washed items</li>
                      <li>Items marked &quot;Final Sale&quot;</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Return Shipping
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>Damaged/Wrong items:</strong> Return shipping FREE (we arrange pickup)</li>
                    <li>• <strong>Change of mind:</strong> Return shipping cost borne by customer</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Exchange Policy */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                <ArrowLeftRight className="w-6 h-6 text-purple-500" />
                Exchange Policy
              </h2>
              
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  We offer <strong>FREE exchange</strong> for the same product in a different size/color (subject to availability).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
                    <h3 className="font-semibold text-sm mb-1">Request Exchange</h3>
                    <p className="text-xs text-muted-foreground">Contact us within 7 days</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
                    <h3 className="font-semibold text-sm mb-1">Ship Back</h3>
                    <p className="text-xs text-muted-foreground">Return original product</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
                    <h3 className="font-semibold text-sm mb-1">Receive New</h3>
                    <p className="text-xs text-muted-foreground">Get your exchanged item</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Exchange for Different Product?</h4>
                  <p className="text-sm text-blue-700">
                    If you want a completely different product, please initiate a return for refund and place a new order.
                    This ensures faster processing and delivery.
                  </p>
                </div>
              </div>
            </section>

            {/* Special Instructions for Laddu Gopal Dresses */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-amber-500" />
                Special Note: Laddu Gopal Dresses
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm leading-relaxed">
                  Since Laddu Gopal dress sizes are specific to your murti, please ensure you have selected the correct size before ordering. 
                  Use our <Link to="/" className="text-amber-600 underline font-semibold hover:text-amber-700">Size Guide</Link> to measure accurately.
                  Exchanges for size issues are allowed, but we recommend double-checking your size to avoid delays.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-heading font-bold mb-3">Questions about Shipping or Returns?</h2>
              <p className="text-muted-foreground mb-4">
                Our team is happy to help you with any shipping, return, or exchange queries.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://wa.me/message/4TZ5RAVABY4HG1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  WhatsApp Us
                </a>
                <a 
                  href="mailto:info@paridhaancreations.xyz" 
                  className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Email Support
                </a>
              </div>
            </section>

            <div className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground italic">
                Last Updated: February 2026
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center space-x-4">
          <Link
            to="/refund-policy"
            className="inline-block border-2 border-primary text-primary px-6 py-3 font-medium hover:bg-primary hover:text-white transition-all rounded-lg"
          >
            View Refund Policy
          </Link>
          <Link
            to="/products"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 font-medium hover:bg-primary/90 transition-all rounded-lg"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
