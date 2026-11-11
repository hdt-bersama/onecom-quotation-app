// Form dinamis penawaran/invoice (Alpine.js). Didaftarkan sebelum Alpine dimuat (defer).
document.addEventListener('alpine:init', () => {
  Alpine.data('docForm', () => {
    const init = JSON.parse(document.getElementById('doc-init').textContent);
    const blank = () => ({ description: '', details: '', qty: 1, unit: '', unit_price: 0, discount_percent: 0 });
    const num = (v) => Number(v) || 0;

    return {
      type: init.type,
      isNew: init.isNew,
      number: init.number,
      numbers: init.numbers,
      labels: init.labels,
      taxPercent: init.taxPercent,
      customers: init.customers,
      customer: init.customer,
      items: init.items.length ? init.items : [blank()],

      setType(t) {
        if (!this.isNew || t === this.type) return;
        // ganti nomor otomatis hanya jika user belum mengubahnya manual
        if (this.number === this.numbers[this.type]) this.number = this.numbers[t];
        this.type = t;
      },

      pickCustomer() {
        const c = this.customers.find(x => x.name.toLowerCase() === (this.customer.name || '').toLowerCase());
        if (c) {
          this.customer.id = c.id;
          this.customer.address = c.address || '';
          this.customer.phone = c.phone || '';
        } else {
          this.customer.id = null;
        }
      },

      add() { this.items.push(blank()); },
      remove(i) { this.items.length > 1 ? this.items.splice(i, 1) : this.items.splice(0, 1, blank()); },

      lineGross(it) { return num(it.qty) * num(it.unit_price); },
      lineDisc(it)  { return this.lineGross(it) * Math.min(100, Math.max(0, num(it.discount_percent))) / 100; },
      lineTotal(it) { return this.lineGross(it) - this.lineDisc(it); },

      get subtotal()      { return this.items.reduce((s, i) => s + this.lineGross(i), 0); },
      get discountTotal() { return this.items.reduce((s, i) => s + this.lineDisc(i), 0); },
      get taxAmount()     { return (this.subtotal - this.discountTotal) * num(this.taxPercent) / 100; },
      get total()         { return this.subtotal - this.discountTotal + this.taxAmount; },

      fmt(n) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(n)); },
    };
  });
});
