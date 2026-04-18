"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Character {
  id: number;
  projectId: number;
  name: string;
  visualDescription: string;
  voiceDescription: string;
  personality: string | null;
  referenceImageUrl: string | null;
  createdAt: Date;
}

interface CharactersPanelProps {
  projectId: number;
}

export function CharactersPanel({ projectId }: CharactersPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    visualDescription: "",
    voiceDescription: "",
    personality: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`);
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } catch (err) {
      console.error("Failed to fetch characters:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", visualDescription: "", voiceDescription: "", personality: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.visualDescription || !form.voiceDescription) return;

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/projects/${projectId}/characters/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setCharacters(chars => chars.map(c => c.id === editingId ? { ...c, ...form } : c));
        }
      } else {
        const res = await fetch(`/api/projects/${projectId}/characters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const newChar = await res.json();
          setCharacters(chars => [...chars, newChar]);
        }
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save character:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (char: Character) => {
    setForm({
      name: char.name,
      visualDescription: char.visualDescription,
      voiceDescription: char.voiceDescription,
      personality: char.personality || "",
    });
    setEditingId(char.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this character?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/characters/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCharacters(chars => chars.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete character:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Characters</h2>
        <Button
          onClick={() => setShowForm(true)}
          className="text-xs px-3 py-1.5"
          variant={showForm ? "ghost" : "default"}
        >
          {showForm ? "Cancel" : "+ Add Character"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <Input
              placeholder="e.g., Detective Sarah"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Visual Description</label>
            <Input
              placeholder="e.g., female, black leather jacket, red scarf"
              value={form.visualDescription}
              onChange={(e) => setForm(f => ({ ...f, visualDescription: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Voice Description</label>
            <Input
              placeholder="e.g., deep raspy voice"
              value={form.voiceDescription}
              onChange={(e) => setForm(f => ({ ...f, voiceDescription: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Personality (optional)</label>
            <Input
              placeholder="e.g., stoic, determined"
              value={form.personality}
              onChange={(e) => setForm(f => ({ ...f, personality: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : editingId ? "Update Character" : "Add Character"}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : characters.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">No characters yet. Add one to use in prompt generation.</p>
      ) : (
        <div className="space-y-2">
          {characters.map((char) => (
            <div
              key={char.id}
              className="p-3 border rounded-lg flex justify-between items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{char.name}</p>
                <p className="text-xs text-muted-foreground truncate">{char.visualDescription}</p>
                <p className="text-xs text-muted-foreground truncate">Voice: {char.voiceDescription}</p>
                {char.personality && (
                  <p className="text-xs text-muted-foreground">Personality: {char.personality}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(char)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(char.id)}
                  className="text-xs text-red-500 hover:text-red-600 px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}