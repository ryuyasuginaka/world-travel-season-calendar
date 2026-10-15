(() => {
  'use strict';

  // Editorial groupings only. The destination source remains js/data.js.
  const destinationMoods = {
    portugal: ['sea', 'town', 'food'],
    taiwan: ['town', 'food'],
    swiss: ['nature'],
  };
  const moodLabels = {
    all: 'すべて',
    sea: '海を眺めたい',
    town: '街を歩きたい',
    food: 'おいしいものを',
    nature: '自然のなかへ',
  };

  const controls = document.querySelector('.mood-controls');
  const filterButtons = [...document.querySelectorAll('[data-mood]')];
  const destinationCards = [...document.querySelectorAll('[data-destination]')];
  const status = document.querySelector('.filter-status');
  const empty = document.querySelector('.empty-message');

  function selectMood(mood) {
    if (!Object.hasOwn(moodLabels, mood)) return;
    let count = 0;
    destinationCards.forEach((card) => {
      const matches = mood === 'all' || (destinationMoods[card.dataset.destination] || []).includes(mood);
      card.hidden = !matches;
      if (matches) count += 1;
    });
    filterButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mood === mood));
    });
    empty.hidden = count > 0;
    status.textContent = mood === 'all'
      ? `編集室が選んだ、${count}つの旅先候補。`
      : `「${moodLabels[mood]}」の気分に、${count}つの旅先候補。`;
  }

  controls.hidden = false;
  filterButtons.forEach((button) => button.addEventListener('click', () => selectMood(button.dataset.mood)));
  document.querySelectorAll('[data-select-mood]').forEach((link) => {
    link.addEventListener('click', () => selectMood(link.dataset.selectMood));
  });

  const menuButton = document.querySelector('.menu-toggle');
  const menuLabel = document.querySelector('.menu-toggle-label');
  const navigation = document.querySelector('#primary-nav');
  const mobile = window.matchMedia('(max-width: 760px)');

  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuLabel.textContent = 'メニュー';
    navigation.hidden = mobile.matches;
  }

  function syncMenu() {
    menuButton.hidden = !mobile.matches;
    closeMenu();
  }

  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menuLabel.textContent = expanded ? 'メニュー' : '閉じる';
    navigation.hidden = expanded;
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobile.matches && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  mobile.addEventListener('change', syncMenu);
  syncMenu();

  // Keep the editorial notes available as normal anchor targets without JavaScript.
  const dialog = document.querySelector('.information-dialog');
  const source = document.querySelector('.site-information');
  const content = document.querySelector('.dialog-content');
  let dialogTrigger = null;
  if (typeof dialog.showModal === 'function') {
    source.hidden = true;
    const informationLinks = [...document.querySelectorAll('[data-dialog]')];

    function openInformation(link) {
      const section = document.getElementById(link.dataset.dialog);
      if (!section) return;
      dialogTrigger = link;
      const cloned = section.cloneNode(true);
      cloned.removeAttribute('id');
      cloned.querySelector('h2').id = 'dialog-title';
      content.replaceChildren(cloned);
      if (!dialog.open) dialog.showModal();
      document.body.classList.add('dialog-open');
    }

    function openInformationFromHash() {
      // Match only the four links already present in the page, never an arbitrary selector.
      const link = informationLinks.find((item) => `#${item.dataset.dialog}` === window.location.hash);
      if (link) openInformation(link);
    }

    informationLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openInformation(link);
      });
    });
    window.addEventListener('hashchange', openInformationFromHash);
    openInformationFromHash();
    document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) {
        dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      dialogTrigger?.focus();
    });
  }
})();
