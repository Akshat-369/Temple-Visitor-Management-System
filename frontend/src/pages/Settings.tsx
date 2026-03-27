import React, { useEffect, useState } from 'react';
import { getAdminMandals, addMandal, deleteMandal } from '../services/api';
import { Plus, Trash2, Tag } from 'lucide-react';

const Settings: React.FC = () => {
  const [mandals, setMandals] = useState<string[]>([]);
  const [newMandal, setNewMandal] = useState('');
  const [loading, setLoading] = useState(true);
  const [formLink, setFormLink] = useState('');

  const fetchMandals = async () => {
    try {
      setLoading(true);
      const res = await getAdminMandals();
      setMandals(res.data);
    } catch (err) {
      console.error('Failed to fetch mandals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMandals();
    setFormLink(window.location.origin + '/visit');
  }, []);

  const handleAdd = async () => {
    if (!newMandal.trim()) return;
    try {
      await addMandal(newMandal.trim());
      setNewMandal('');
      fetchMandals();
    } catch (err) {
      console.error('Failed to add mandal', err);
    }
  };

  const handleDelete = async (mandal: string) => {
    try {
      await deleteMandal(mandal);
      fetchMandals();
    } catch (err) {
      console.error('Failed to delete mandal', err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(formLink);
    alert('Form link copied to clipboard!');
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Sharable Form Link */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">📋 Sharable Form Link</h3>
        <p className="text-sm text-slate-500 mb-3">
          Share this link with representatives to submit visit requests. No login required.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={formLink}
            readOnly
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Mandal Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">🏛️ Manage Mandals</h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newMandal}
            onChange={(e) => setNewMandal(e.target.value)}
            placeholder="Enter mandal name"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : mandals.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No mandals added yet</p>
        ) : (
          <div className="space-y-2">
            {mandals.map((mandal, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Tag size={14} className="text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">{mandal}</span>
                </div>
                <button
                  onClick={() => handleDelete(mandal)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
