import React from "react";
import { Link } from "react-router-dom";
import { RefreshCw, XCircle, Clock, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import SEO from "@/components/SEO";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <SEO 
        title="Cancellation & Refund Policy - Paridhaan Creations"
        description="Learn about our cancellation and refund policy. Easy cancellation before shipping and hassle-free refunds for eligible products."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <RefreshCw className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4" data-testid="refund-policy-title">
            Cancellation & Refund Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Your satisfaction is our priority. Here&apos;s everything you need to know.
          </p>
        </div>
        
        <div className="bg-white border border-border/40 rounded-xl shadow-sm overflow-hidden">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-b">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-sm">Easy Cancellation</h3>
                <p className="text-xs text-muted-foreground">Before shipping</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
              <Clock className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-sm">7-10 Days Refund</h3>
                <p className="text-xs text-muted-foreground">To original payment</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
              <CreditCard className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-sm">100% Secure</h3>
                <p className="text-xs text-muted-foreground">Money-back guarantee</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Cancellation Policy */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                Order Cancellation
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p><strong>Before Shipping:</strong> Orders can be cancelled anytime before they are shipped. Full refund will be initiated immediately.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p><strong>After Shipping:</strong> Once shipped, cancellation is not possible. You may refuse delivery or initiate a return after receiving.</p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p><strong>How to Cancel:</strong> Contact us via WhatsApp or email with your Order ID. We will process your cancellation within 24 hours.</p>
                </div>
              </div>
            </section>

            {/* Refund Policy */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-blue-500" />
                Refund Policy
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  We want you to be completely satisfied with your purchase. If you&apos;re not happy, here&apos;s how our refund process works:
                </p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Eligible for Full Refund:</h3>
                  <ul className="list-disc list-inside text-green-700 space-y-1 text-sm">
                    <li>Damaged or defective products</li>
                    <li>Wrong item delivered</li>
                    <li>Product significantly different from description</li>
                    <li>Order cancelled before shipping</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">Not Eligible for Refund:</h3>
                  <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
                    <li>Products damaged due to misuse by customer</li>
                    <li>Items without original packaging/tags</li>
                    <li>Customized or personalized items</li>
                    <li>Products returned after 7 days of delivery</li>
                    <li>Items marked as &quot;Non-Returnable&quot;</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Refund Timeline */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" />
                Refund Timeline
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold">Payment Method</th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold">Refund Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 text-sm">UPI / Wallet</td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 font-medium">2-3 Business Days</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm">Debit Card</td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-blue-600 font-medium">5-7 Business Days</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 text-sm">Credit Card</td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-blue-600 font-medium">7-10 Business Days</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm">Net Banking</td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-blue-600 font-medium">5-7 Business Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                * Refund timelines depend on your bank&apos;s processing time. Contact your bank if refund is delayed beyond mentioned period.
              </p>
            </section>

            {/* How to Request Refund */}
            <section>
              <h2 className="text-2xl font-heading font-bold mb-4">How to Request a Refund?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
                  <h3 className="font-semibold mb-1">Contact Us</h3>
                  <p className="text-sm text-muted-foreground">WhatsApp or Email with Order ID</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
                  <h3 className="font-semibold mb-1">Share Details</h3>
                  <p className="text-sm text-muted-foreground">Reason + Photos (if damaged)</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
                  <h3 className="font-semibold mb-1">Get Refund</h3>
                  <p className="text-sm text-muted-foreground">Approved refunds processed quickly</p>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-heading font-bold mb-3">Need Help?</h2>
              <p className="text-muted-foreground mb-4">
                Our customer support team is here to help you with any refund or cancellation queries.
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
            to="/shipping-policy"
            className="inline-block border-2 border-primary text-primary px-6 py-3 font-medium hover:bg-primary hover:text-white transition-all rounded-lg"
          >
            View Shipping Policy
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
