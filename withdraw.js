/* MOYEN HILLS — "Cancel an order" (withdraw.html)
 * The EU withdrawal button: fill in, check, confirm. The notice is emailed to the
 * shop (FormSubmit, with an automatic confirmation to the buyer) and stored in
 * Supabase when it is connected. Either one reaching the shop counts.
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
      items: d.items.trim() || 'The whole order',
    };
    const rows = [['Name', notice.name], ['Email', notice.email], ['Order number', notice.order || 'Not given'],
      ['Ordered / received on', notice.order_date || 'Not given'], ['Items', notice.items]];
    const dl = $('[data-wd-summary]');
    dl.replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
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
    say('Sending…');
    const when = new Date();
    const stamp = when.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
    const text = `I hereby give notice that I withdraw from my contract for the sale of the following goods: ${notice.items}. Order number: ${notice.order || 'not given'}. Ordered/received on: ${notice.order_date || 'not given'}. Name: ${notice.name}. Email: ${notice.email}. Sent on ${stamp}.`;

    const emailed = settings.orderEmail ? fetch(`https://formsubmit.co/ajax/${encodeURIComponent(settings.orderEmail)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Withdrawal: order ${notice.order || '(no number)'} from ${notice.name}`,
        _template: 'table',
        _replyto: notice.email,
        email: notice.email,
        // The buyer's confirmation on a durable medium (an email), sent by FormSubmit
        _autoresponse: `MOYEN HILLS received your withdrawal on ${stamp}.\n\n${text}\n\nPlease send the items back within 14 days. We refund you within 14 days of receiving them. Questions: ${settings.contactEmail || ''}`,
        Notice: text,
        Name: notice.name,
        'Order number': notice.order || '—',
        Items: notice.items,
        Received: stamp,
      }),
    }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || res.status);
      return true;
    }).catch((err) => { console.warn('Withdrawal email not sent:', err.message); return false; }) : Promise.resolve(false);

    const stored = sb ? sb.rpc('request_withdrawal', {
      p_name: notice.name, p_email: notice.email, p_order: notice.order || null,
      p_order_date: notice.order_date || null, p_items: notice.items,
    }).then(({ error }) => { if (error) throw error; return true; })
      .catch((err) => { console.warn('Withdrawal not stored:', err.message); return false; }) : Promise.resolve(false);

    const [sent, saved] = await Promise.all([emailed, stored]);
    btn.disabled = false;
    if (!sent && !saved) {
      const mail = `mailto:${settings.contactEmail}?subject=${encodeURIComponent('Withdrawal')}&body=${encodeURIComponent(text)}`;
      msg.textContent = '';
      msg.classList.add('is-error');
      msg.append('This could not be sent. Please ');
      const a = document.createElement('a');
      a.href = mail;
      a.textContent = `email it to ${settings.contactEmail}`;
      msg.append(a, ' — your notice is already written out.');
      return;
    }
    say('');
    check.hidden = true;
    done.hidden = false;
    $('[data-wd-done-text]').textContent = `We received your withdrawal on ${stamp}${sent ? `, and sent a confirmation to ${notice.email}` : ''}. Keep this page or take a screenshot as your record.`;
    $('#wd-done-title').focus();
  });
})();
