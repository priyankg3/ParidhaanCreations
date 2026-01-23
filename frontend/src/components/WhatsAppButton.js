import React from "react";
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "919871819508";

export default function WhatsAppButton({ message = "Hi! I have a question about Paridhaan Creations." }) {
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group"
      aria-label="Chat on WhatsApp"
      data-testid="whatsapp-button"
    >
      <MessageCircle className="w-7 h-7" />
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 px-3 py-2 rounded-lg shadow-md text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Chat with us
      </span>
    </button>
  );
}

// Helper function to generate order-specific WhatsApp message
export function getOrderWhatsAppLink(orderId, orderTotal) {
  const message = `Hi! I just placed order #${orderId} for ₹${orderTotal}. I have a question about my order.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Helper function for support queries
export function getSupportWhatsAppLink(subject) {
  const message = `Hi! I need help with: ${subject}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
