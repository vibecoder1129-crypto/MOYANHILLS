/* MOYEN HILLS — "Cancel an order" (withdraw.html)
 * The EU withdrawal button: fill in, check, confirm. The notice is stored in
 * Supabase, and the database emails it to the shop with a dated confirmation to
 * the buyer (supabase/notify.sql). If it can't be stored, the buyer gets the notice
 * written out to email themselves.
 */
(() => {
  const box = document.querySelector('[data-withdraw]');
  if (!box) return;
  const $ = (s) => box.querySelector(s);
  const settings = window.mhData?.settings || {};
  const sb = window.mhData?.supabase || null;
  const form = $('[data-wd-form]');
  const check = $('[data-wd-check]');
  const done = $('[data-wd-done]');
  const msg = $('[data-wd-msg]');
  const t = window.mhT || ((en, v) => (v ? en.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : en));
  const LV = window.mhLang === 'lv';
  const say = (text, isError) => { msg.textContent = text; msg.classList.toggle('is-error', !!isError); };
  let notice = null;

  // Fill in what we already know: ?order=123 in the link, the signed-in email
  const wanted = new URLSearchParams(location.search).get('order');
  if (wanted) form.elements.order.value = wanted.replace(/[^\w-]/g, '').slice(0, 40);
  setTimeout(() => {
    const user = window.mhAccount?.user;
    if (user?.email && !form.elements.email.value) form.elements.email.value = user.email;
  }, 800);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    say('');
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form));
    if (d._honey) return;
    notice = {
      name: d.name.trim(),
      email: d.email.trim(),
      order: d.order.trim(),
      order_date: d.order_date || '',
      items: d.items.trim(),
    };
    const rows = [['Name', notice.name], ['Email', notice.email], ['Order number', notice.order || t('Not given')],
      ['Ordered / received on', notice.order_date || t('Not given')], ['Items', notice.items || t('The whole order')]];
    const dl = $('[data-wd-summary]');
    dl.replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = t(k);
      const dd = document.createElement('dd'); dd.textContent = v;
      return [dt, dd];
    }));
    form.hidden = true;
    check.hidden = false;
    $('#wd-check-title').focus();
  });

  $('[data-wd-back]').addEventListener('click', () => { check.hidden = true; form.hidden = false; say(''); form.elements.name.focus(); });

  $('[data-wd-confirm]').addEventListener('click', async () => {
    if (!notice) return;
    const btn = $('[data-wd-confirm]');
    btn.disabled = true;
    say(t('Sending…'));
    const when = new Date();
    const stamp = when.toLocaleString(LV ? 'lv-LV' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
    const text = `I hereby give notice that I withdraw from my contract for the sale of the following goods: ${notice.items || 'The whole order'}. Order number: ${notice.order || 'not given'}. Ordered/received on: ${notice.order_date || 'not given'}. Name: ${notice.name}. Email: ${notice.email}. Sent on ${stamp}.`;

    const args = {
      p_name: notice.name, p_email: notice.email, p_order: notice.order || null,
      p_order_date: notice.order_date || null, p_items: notice.items, p_lang: LV ? 'lv' : 'en',
    };
    // A database without the language yet (privacy.sql not re-run) gets the call without it
    const stored = sb ? sb.rpc('request_withdrawal', args)
      .then((res) => (res.error?.code === 'PGRST202' ? sb.rpc('request_withdrawal', { ...args, p_lang: undefined }) : res))
      .then(({ error }) => { if (error) throw error; return true; })
      .catch((err) => { console.warn('Withdrawal not stored:', err.message); return false; }) : Promise.resolve(false);

    const saved = await stored;
    btn.disabled = false;
    if (!saved) {
      const mail = `mailto:${settings.contactEmail}?subject=${encodeURIComponent('Withdrawal')}&body=${encodeURIComponent(text)}`;
      msg.textContent = '';
      msg.classList.add('is-error');
      msg.append(t('This could not be sent. Please '));
      const a = document.createElement('a');
      a.href = mail;
      a.textContent = t('email it to {email}', { email: settings.contactEmail });
      msg.append(a, t(' — your notice is already written out.'));
      return;
    }
    say('');
    check.hidden = true;
    done.hidden = false;
    $('[data-wd-done-text]').textContent = t('We received your withdrawal on {stamp}. A confirmation is on its way to {email}. Keep this page or take a screenshot as your record too.', { stamp, email: notice.email });
    $('#wd-done-title').focus();
  });
})();
