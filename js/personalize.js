/* =========================================================================
   Wish_Received.VR — personalize.js
   Reads ?name=…&relation=… via URLSearchParams, sanitises the values and
   fills every [data-slot] in the page. textContent-only ⇒ XSS-safe.
   ========================================================================= */
(function () {
  'use strict';

  var MAX_NAME = 28;
  var MAX_RELATION = 30;

  function getParams() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (err) {
      return new URLSearchParams('');
    }
  }

  /* Trim, collapse whitespace, strip control/angle-bracket chars, cap length. */
  function clean(value, max) {
    if (typeof value !== 'string') return '';
    value = value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
    if (!value) return '';
    if (value.length > max) value = value.slice(0, max).replace(/\s+$/, '') + '…';
    return value;
  }

  var params = getParams();
  var name = clean(params.get('name'), MAX_NAME);
  var relation = clean(params.get('relation'), MAX_RELATION);

  var person = {
    name: name,
    relation: relation,
    hasName: !!name,
    hasRelation: !!relation
  };

  window.VR = window.VR || {};
  window.VR.person = person;

  /* Fill every slot; each element may declare its own data-fallback. */
  document.querySelectorAll('[data-slot="name"]').forEach(function (el) {
    el.textContent = person.hasName ? name : (el.getAttribute('data-fallback') || 'there');
  });
  document.querySelectorAll('[data-slot="relation"]').forEach(function (el) {
    el.textContent = person.hasRelation ? relation : (el.getAttribute('data-fallback') || 'Family');
  });

  /* Drop the comma when there is no name → "Hey there" / "You're officially…" */
  document.querySelectorAll('.name-comma').forEach(function (el) {
    el.hidden = !person.hasName;
  });
  var msgVerb = document.getElementById('msgVerb');
  if (msgVerb && !person.hasName) {
    msgVerb.textContent = 'You\u2019re';
  }

  /* HUD lines that embed the personalised identity */
  var guestLine = document.getElementById('guestLine');
  if (guestLine) {
    guestLine.innerHTML = '';
    guestLine.textContent = 'GUEST ID: ' + (person.hasName ? name : 'FAMILY') +
      ' \u00b7 STATUS: CONFIRMED \u2713';
  }

  var deliveredLine = document.getElementById('deliveredLine');
  if (deliveredLine) {
    deliveredLine.textContent = person.hasName || person.hasRelation
      ? 'DELIVERED TO: ' + (person.hasName ? name : 'FAMILY') +
        (person.hasRelation ? ' \u00b7 ' + relation : '') + ' \u2713'
      : 'DELIVERED WITH LOVE \u2713';
  }

  if (person.hasName) {
    document.title = 'Wish_Received.VR \u2014 For ' + name;
  }
})();
