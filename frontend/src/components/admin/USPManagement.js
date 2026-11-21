/**
 * Admin component for managing the USP Strip (static trust-signal row
 * shown below the hero). Uses the same visual language as the Ticker
 * admin UI so it feels familiar.
 *
 * Features:
 *   - List all items (active + inactive)
 *   - Create with icon + text + display order
 *   - Toggle active/inactive
 *   - Edit in place
 *   - Delete
 *   - One-click "Seed defaults" when the list is empty
 *
 * Data shape: { usp_id, icon, text, is_active, order }
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, EyeOff, Sparkles } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMPTY_FORM = { icon: "✨", text: "", is_active: true, order: 0 };

export default function USPManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/usp/all`, { withCredentials: true });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error("Failed to load USP items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order: items.length });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item.usp_id);
    setForm({
      icon: item.icon || "✨",
      text: item.text || "",
      is_active: item.is_active !== false,
      order: item.order || 0,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) {
      toast.error("Please enter the USP text");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${API}/usp/${editingId}`, form, { withCredentials: true });
        toast.success("USP item updated");
      } else {
        await axios.post(`${API}/usp`, form, { withCredentials: true });
        toast.success("USP item created");
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error("Failed to save USP item");
    }
  };

  const handleToggle = async (item) => {
    try {
      await axios.patch(`${API}/usp/${item.usp_id}/toggle`, {}, { withCredentials: true });
      await load();
    } catch (e) {
      toast.error("Failed to toggle");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.text}"?`)) return;
    try {
      await axios.delete(`${API}/usp/${item.usp_id}`, { withCredentials: true });
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await axios.post(`${API}/usp/seed-defaults`, {}, { withCredentials: true });
      toast.success(res.data?.message || "Seeded defaults");
      await load();
    } catch (e) {
      toast.error("Failed to seed defaults");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">🏆 USP Strip</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Trust signals shown below the hero (e.g. Free shipping, COD,
            Authentic). Appears on every device — 4 across on desktop, 2×2
            on mobile. Ideal count: 4 items.
          </p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Seed defaults
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add USP item
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">
            No USP items yet. Add 4 items (recommended) or tap <b>Seed defaults</b> to
            get started with Free shipping / COD / Handcrafted / Authentic.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3 text-sm font-semibold">Order</th>
                <th className="text-left p-3 text-sm font-semibold">Icon</th>
                <th className="text-left p-3 text-sm font-semibold">Text</th>
                <th className="text-left p-3 text-sm font-semibold">Status</th>
                <th className="text-right p-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.usp_id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 text-sm">{item.order}</td>
                  <td className="p-3 text-2xl">{item.icon || "✨"}</td>
                  <td className="p-3">{item.text}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleToggle(item)}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title={item.is_active ? "Deactivate" : "Activate"}
                      >
                        {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-background w-full max-w-md rounded-lg shadow-xl p-6 space-y-4"
          >
            <h3 className="text-xl font-bold">
              {editingId ? "Edit USP Item" : "Add USP Item"}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                maxLength={8}
                placeholder="🚚"
                className="w-full p-2 border rounded text-2xl text-center"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pick any emoji — appears to the left of the text.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Text</label>
              <input
                type="text"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                maxLength={80}
                placeholder="Free Shipping over ₹999"
                className="w-full p-2 border rounded"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keep short — 3 to 6 words works best (max 80 chars).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Display Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first (0, 1, 2, …).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="usp-active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="usp-active" className="text-sm font-medium">
                Active (show on site)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                {editingId ? "Save changes" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
