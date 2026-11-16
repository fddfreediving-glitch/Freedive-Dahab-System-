import React, { useState } from 'react';
import { ArrowLeft, Archive, Check, Pencil, Plus, X } from 'lucide-react';
import type {
  PosCatalogCurrency,
  PosCatalogGroup,
  PosCatalogItem,
  PosCatalogItemInput,
} from '../types';

interface PosCatalogManagerProps {
  items: PosCatalogItem[];
  loadError: string | null;
  onSave: (item: PosCatalogItemInput, id?: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onClose: () => void;
}

interface CatalogFormState {
  group: PosCatalogGroup;
  name: string;
  category: PosCatalogItemInput['category'];
  price: string;
  price_currency: PosCatalogCurrency;
  unit: string;
  description: string;
  tier_minimum_quantity: string;
  tier_unit_price: string;
  stay_discount: boolean;
}

const groups: PosCatalogGroup[] = ['Courses', 'Packages', 'Training', 'Activities', 'Accommodation', 'Shop'];
const categories: PosCatalogItemInput['category'][] = [
  'course', 'package', 'accommodation', 'activity', 'workshop', 'training', 'gear_rental', 'shop', 'other',
];
const currencies: PosCatalogCurrency[] = ['EUR', 'EGP', 'USD', 'GBP'];

const emptyForm = (): CatalogFormState => ({
  group: 'Courses',
  name: '',
  category: 'course',
  price: '',
  price_currency: 'EUR',
  unit: '',
  description: '',
  tier_minimum_quantity: '',
  tier_unit_price: '',
  stay_discount: false,
});

const formFromItem = (item: PosCatalogItem): CatalogFormState => ({
  group: item.group,
  name: item.name,
  category: item.category,
  price: item.price === null ? '' : String(item.price),
  price_currency: item.price_currency || 'EUR',
  unit: item.unit || '',
  description: item.description || '',
  tier_minimum_quantity: item.tier_minimum_quantity === null ? '' : String(item.tier_minimum_quantity),
  tier_unit_price: item.tier_unit_price === null ? '' : String(item.tier_unit_price),
  stay_discount: item.stay_discount === 1,
});

const controlClass = 'min-h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const fieldLabelClass = 'mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300';

export const PosCatalogManager: React.FC<PosCatalogManagerProps> = ({ items, loadError, onSave, onArchive, onClose }) => {
  const [form, setForm] = useState<CatalogFormState | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCreate = () => {
    setEditingId(undefined);
    setForm(emptyForm());
    setError(null);
  };

  const startEdit = (item: PosCatalogItem) => {
    setEditingId(item.id);
    setForm(formFromItem(item));
    setError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        group: form.group,
        name: form.name.trim(),
        category: form.category,
        price: form.price.trim() ? Number(form.price) : null,
        price_currency: form.price.trim() ? form.price_currency : null,
        unit: form.unit.trim() || null,
        description: form.description.trim() || null,
        tier_minimum_quantity: form.tier_minimum_quantity.trim() ? Number(form.tier_minimum_quantity) : null,
        tier_unit_price: form.tier_unit_price.trim() ? Number(form.tier_unit_price) : null,
        stay_discount: form.stay_discount,
      }, editingId);
      setForm(null);
      setEditingId(undefined);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The item could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    setError(null);
    try {
      await onArchive(id);
      setArchivingId(null);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'The item could not be removed.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-[#E8EEF7] pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#28334E] dark:text-white">Manage POS catalogue</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Add or update products and services used when creating customer bills.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to point of sale
        </button>
      </header>

      {(error || loadError) && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error || `Catalogue unavailable: ${loadError}`}</p>}

      {form ? (
        <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-[#E8EEF7] bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#28334E] dark:text-white">{editingId ? 'Edit item' : 'Add product or service'}</h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Cancel item editing" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:hover:bg-slate-800">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="catalog-name" className={fieldLabelClass}>Item name *</label>
              <input id="catalog-name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={controlClass} />
            </div>
            <div>
              <label htmlFor="catalog-group" className={fieldLabelClass}>POS section *</label>
              <select id="catalog-group" value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value as PosCatalogGroup })} className={controlClass}>
                {groups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="catalog-category" className={fieldLabelClass}>Billing category *</label>
              <select id="catalog-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as PosCatalogItemInput['category'] })} className={controlClass}>
                {categories.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="catalog-price" className={fieldLabelClass}>Unit price</label>
              <input id="catalog-price" type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Blank = confirm at checkout" className={controlClass} />
            </div>
            <div>
              <label htmlFor="catalog-currency" className={fieldLabelClass}>Price currency</label>
              <select id="catalog-currency" value={form.price_currency} disabled={!form.price} onChange={(event) => setForm({ ...form, price_currency: event.target.value as PosCatalogCurrency })} className={controlClass}>
                {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="catalog-unit" className={fieldLabelClass}>Unit label</label>
              <input id="catalog-unit" maxLength={40} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="e.g. day, night, session" className={controlClass} />
            </div>
            <div>
              <label htmlFor="catalog-tier-quantity" className={fieldLabelClass}>Group-rate minimum quantity</label>
              <input id="catalog-tier-quantity" type="number" min="2" step="1" value={form.tier_minimum_quantity} onChange={(event) => setForm({ ...form, tier_minimum_quantity: event.target.value })} className={controlClass} />
            </div>
            <div>
              <label htmlFor="catalog-tier-price" className={fieldLabelClass}>Group-rate unit price</label>
              <input id="catalog-tier-price" type="number" min="0.01" step="0.01" value={form.tier_unit_price} onChange={(event) => setForm({ ...form, tier_unit_price: event.target.value })} className={controlClass} />
            </div>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.stay_discount} onChange={(event) => setForm({ ...form, stay_discount: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#4C8BF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5]" />
              Apply existing long-stay discounts
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="catalog-description" className={fieldLabelClass}>Description and checkout notes</label>
              <textarea id="catalog-description" rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${controlClass} py-2`} />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[#E8EEF7] pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setForm(null)} disabled={saving} className="min-h-11 rounded-lg border border-[#E2E8F0] px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4C8BF5] px-4 text-sm font-semibold text-white hover:bg-[#3B7BE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C8BF5] disabled:opacity-50">
              <Check className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </form>
      ) : (
        <section aria-labelledby="catalog-items-heading" className="overflow-hidden rounded-2xl border border-[#E8EEF7] bg-white dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="flex flex-col gap-3 border-b border-[#E8EEF7] p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 id="catalog-items-heading" className="text-lg font-bold text-[#28334E] dark:text-white">Products and services</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{items.length} active catalogue items</p>
            </div>
            <button type="button" onClick={startCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4C8BF5] px-4 text-sm font-semibold text-white hover:bg-[#3B7BE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C8BF5]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </button>
          </div>
          <ul className="divide-y divide-[#E8EEF7] dark:divide-slate-800">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="font-semibold text-[#28334E] dark:text-white">{item.name}</p>
                  <p className="mt-1 text-xs capitalize text-slate-600 dark:text-slate-400">
                    {item.group} · {item.category.replaceAll('_', ' ')} · <span className="font-data">{item.price === null ? 'Price set at checkout' : `${item.price_currency} ${item.price.toFixed(2)}${item.unit ? ` / ${item.unit}` : ''}`}</span>
                  </p>
                </div>
                {archivingId === item.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Remove this item from future sales?</span>
                    <button type="button" onClick={() => void handleArchive(item.id)} className="min-h-10 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">Remove</button>
                    <button type="button" onClick={() => setArchivingId(null)} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:text-slate-200 dark:hover:bg-slate-800">Keep</button>
                  </div>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => startEdit(item)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button type="button" onClick={() => setArchivingId(item.id)} aria-label={`Remove ${item.name} from the catalogue`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 dark:text-rose-300 dark:hover:bg-rose-950/40">
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
            {items.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-600 dark:text-slate-400">No active items. Add a product or service to use it in a bill.</li>}
          </ul>
          <p className="border-t border-[#E8EEF7] px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:px-5">
            Removed items are archived and stay on existing customer bills. Gear rentals continue to be managed through Equipment inventory.
          </p>
        </section>
      )}
    </div>
  );
};
