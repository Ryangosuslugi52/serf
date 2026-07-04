// =========================================================
// Шеф-стол — логика MVP
// =========================================================

(function () {
  'use strict';

  const RENTAL_PRICE = 500;

  // -------------------------------------------------------
  // Вспомогательные функции дат
  // -------------------------------------------------------

  function addDays(base, days) {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    }) + ', ' + date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const today = new Date();

  // -------------------------------------------------------
  // Mock-данные: мастер-классы на 7 дней вперёд
  // -------------------------------------------------------

  let classes = [
    {
      id: 'cls-001',
      name: 'Итальянская паста с нуля',
      chef: 'Марко Веттори',
      chefRating: 4.9,
      date: addDays(today, 1),
      price: 3200,
      totalSeats: 8,
      availableSeats: 3,
      status: 'available', // available | full | cancelled
      cancelReason: null,
    },
    {
      id: 'cls-002',
      name: 'Азиатский вок: техника и специи',
      chef: 'Ли Вэй',
      chefRating: 4.7,
      date: addDays(today, 2),
      price: 2800,
      totalSeats: 10,
      availableSeats: 0,
      status: 'full',
      cancelReason: null,
    },
    {
      id: 'cls-003',
      name: 'Французские десерты: макарони и не только',
      chef: 'Софи Дюран',
      chefRating: 5.0,
      date: addDays(today, 4),
      price: 3600,
      totalSeats: 6,
      availableSeats: 0,
      status: 'cancelled',
      cancelReason: 'Шеф-повар госпитализирован с травмой руки, замена не найдена',
    },
    {
      id: 'cls-004',
      name: 'Домашний рамен: бульон 12 часов',
      chef: 'Такеши Ямамото',
      chefRating: 4.8,
      date: addDays(today, 5),
      price: 3400,
      totalSeats: 8,
      availableSeats: 5,
      status: 'available',
      cancelReason: null,
    },
    {
      id: 'cls-005',
      name: 'Гриль и стейки: от выбора мяса до подачи',
      chef: 'Виктор Громов',
      chefRating: 4.6,
      date: addDays(today, 6),
      price: 4100,
      totalSeats: 6,
      availableSeats: 2,
      status: 'available',
      cancelReason: null,
    },
  ];

  let bookings = [];
  let selectedClassId = null;
  let selectedBookingId = null;

  // -------------------------------------------------------
  // DOM-ссылки
  // -------------------------------------------------------

  const classListEl = document.getElementById('classList');
  const bookingListEl = document.getElementById('bookingList');
  const bookingsEmptyState = document.getElementById('bookingsEmptyState');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = {
    schedule: document.getElementById('panel-schedule'),
    bookings: document.getElementById('panel-bookings'),
  };

  const bookingModalOverlay = document.getElementById('bookingModalOverlay');
  const modalClassInfo = document.getElementById('modalClassInfo');
  const bookingForm = document.getElementById('bookingForm');
  const rentEquipmentCheckbox = document.getElementById('rentEquipment');
  const totalPriceEl = document.getElementById('totalPrice');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  const ratingModalOverlay = document.getElementById('ratingModalOverlay');
  const ratingChefName = document.getElementById('ratingChefName');
  const starRatingEl = document.getElementById('starRating');
  const stars = Array.from(starRatingEl.querySelectorAll('.star'));
  const ratingThanks = document.getElementById('ratingThanks');
  const ratingModalCloseBtn = document.getElementById('ratingModalCloseBtn');

  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2400);
  }

  // -------------------------------------------------------
  // Рендер карточек классов
  // -------------------------------------------------------

  function renderClasses() {
    classListEl.innerHTML = '';

    classes.forEach((cls) => {
      const card = document.createElement('article');
      card.className = 'class-card';

      let statusPillHtml = '';
      let seatsHtml = '';
      let buttonHtml = '';
      let reasonHtml = '';

      if (cls.status === 'cancelled') {
        card.classList.add('class-card--cancelled');
        statusPillHtml = '<span class="status-pill status-pill--cancelled">Отменён</span>';
        seatsHtml = `<span class="class-seats">${cls.totalSeats} мест всего</span>`;
        reasonHtml = `<div class="cancel-reason">⚠️ ${cls.cancelReason}</div>`;
        buttonHtml = '<button class="btn btn-disabled" disabled>Класс отменён</button>';
      } else if (cls.status === 'full' || cls.availableSeats <= 0) {
        card.classList.add('class-card--full');
        statusPillHtml = '<span class="status-pill status-pill--full">Мест нет</span>';
        seatsHtml = `<span class="class-seats">0 из ${cls.totalSeats} мест</span>`;
        buttonHtml = '<button class="btn btn-disabled" disabled>Мест нет</button>';
      } else {
        statusPillHtml = '<span class="status-pill status-pill--available">Есть места</span>';
        seatsHtml = `<span class="class-seats">${cls.availableSeats} из ${cls.totalSeats} мест</span>`;
        buttonHtml = `<button class="btn btn-primary" data-action="book" data-id="${cls.id}">Записаться</button>`;
      }

      card.innerHTML = `
        <div class="class-card-top">
          <div>
            <h3 class="class-name">${cls.name}</h3>
            <span class="class-date">${formatDate(cls.date)}</span>
          </div>
          ${statusPillHtml}
        </div>
        <div class="class-chef">
          <span class="chef-avatar">👨‍🍳</span>
          <span>${cls.chef}</span>
          <span class="chef-rating">★ ${cls.chefRating.toFixed(1)}</span>
        </div>
        ${reasonHtml}
        <div class="class-card-bottom">
          <div>
            <div class="class-price">${cls.price.toLocaleString('ru-RU')} ₽</div>
            ${seatsHtml}
          </div>
          ${buttonHtml}
        </div>
      `;

      classListEl.appendChild(card);
    });

    classListEl.querySelectorAll('[data-action="book"]').forEach((btn) => {
      btn.addEventListener('click', () => openBookingModal(btn.dataset.id));
    });
  }

  // -------------------------------------------------------
  // Рендер бронирований
  // -------------------------------------------------------

  function renderBookings() {
    bookingListEl.innerHTML = '';

    // Фильтруем только активные или завершенные бронирования (скрываем удаленные/отмененные)
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');

    if (activeBookings.length === 0) {
      bookingsEmptyState.hidden = false;
      return;
    }
    bookingsEmptyState.hidden = true;

    activeBookings.forEach((b) => {
      const card = document.createElement('article');
      card.className = 'booking-card';

      const statusHtml = b.status === 'completed'
        ? '<span class="booking-status booking-status--done">Завершён</span>'
        : '<span class="booking-status">Забронировано</span>';

      let actionHtml = '';
      if (b.status === 'booked') {
        actionHtml = `
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-secondary" style="flex: 1;" data-action="complete" data-id="${b.id}">Завершить класс</button>
            <button class="btn btn-danger" style="background-color: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 8px 12px; border-radius: 8px; cursor: pointer;" data-action="cancel" data-id="${b.id}">Отменить</button>
          </div>
        `;
      } else if (b.status === 'completed' && !b.rating) {
        actionHtml = `<button class="btn btn-secondary btn-block" style="margin-top: 12px;" data-action="rate" data-id="${b.id}">Оценить шефа</button>`;
      } else if (b.rating) {
        actionHtml = `<div class="booking-rating-line" style="margin-top: 12px;">${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)} <span style="color:var(--ink-soft); font-weight:400; margin-left:4px;">ваша оценка</span></div>`;
      }

      card.innerHTML = `
        <div class="booking-card-header">
          <h3 class="class-name">${b.className}</h3>
          ${statusHtml}
        </div>
        <div class="booking-meta">
          Шеф: <strong>${b.chef}</strong><br>
          ${formatDate(b.date)}<br>
          Оплачено: <strong>${b.price.toLocaleString('ru-RU')} ₽</strong>${b.rentEquipment ? ' (с арендой инвентаря)' : ''}
        </div>
        ${actionHtml}
      `;

      bookingListEl.appendChild(card);
    });

    bookingListEl.querySelectorAll('[data-action="complete"]').forEach((btn) => {
      btn.addEventListener('click', () => completeClass(btn.dataset.id));
    });
    bookingListEl.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => cancelBooking(btn.dataset.id));
    });
    bookingListEl.querySelectorAll('[data-action="rate"]').forEach((btn) => {
      btn.addEventListener('click', () => openRatingModal(btn.dataset.id));
    });
  }

  // -------------------------------------------------------
  // Отмена бронирования (ИСПРАВЛЕННЫЙ БАГ)
  // -------------------------------------------------------
  function cancelBooking(bookingId) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Меням статус брони на отмененный
    booking.status = 'cancelled';

    // Находим исходный кулинарный класс и возвращаем ему место!
    const cls = classes.find((c) => c.id === booking.classId);
    if (cls) {
      cls.availableSeats += 1;
      // Если класс был заполнен, открываем его для записи снова
      if (cls.status === 'full') {
        cls.status = 'available';
      }
    }

    renderClasses();
    renderBookings();
    showToast('Запись успешно отменена, место возвращено');
  }

  // -------------------------------------------------------
  // Другие функции управления
  // -------------------------------------------------------

  function switchTab(tabName) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    Object.entries(tabPanels).forEach(([name, panel]) => {
      const isActive = name === tabName;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });

    if (tabName === 'bookings') {
      renderBookings();
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function computeTotal(cls) {
    let total = cls.price;
    if (rentEquipmentCheckbox.checked) {
      total += RENTAL_PRICE;
    }
    return total;
  }

  function updateTotalPriceDisplay() {
    const cls = classes.find((c) => c.id === selectedClassId);
    if (!cls) return;
    totalPriceEl.textContent = computeTotal(cls).toLocaleString('ru-RU') + ' ₽';
  }

  function openBookingModal(classId) {
    const cls = classes.find((c) => c.id === classId);
    if (!cls || cls.availableSeats <= 0 || cls.status !== 'available') return;

    selectedClassId = classId;
    rentEquipmentCheckbox.checked = false;
    bookingForm.reset();

    modalClassInfo.innerHTML = `
      <strong>${cls.name}</strong>
      Шеф: ${cls.chef} · ★ ${cls.chefRating.toFixed(1)}<br>
      ${formatDate(cls.date)}<br>
      Базовая стоимость: ${cls.price.toLocaleString('ru-RU')} ₽
    `;

    updateTotalPriceDisplay();
    bookingModalOverlay.hidden = false;
  }

  function closeBookingModal() {
    bookingModalOverlay.hidden = true;
    selectedClassId = null;
  }

  rentEquipmentCheckbox.addEventListener('change', updateTotalPriceDisplay);
  modalCloseBtn.addEventListener('click', closeBookingModal);
  bookingModalOverlay.addEventListener('click', (e) => {
    if (e.target === bookingModalOverlay) closeBookingModal();
  });

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const cls = classes.find((c) => c.id === selectedClassId);
    if (!cls || cls.availableSeats <= 0) {
      closeBookingModal();
      renderClasses();
      return;
    }

    cls.availableSeats -= 1;
    if (cls.availableSeats <= 0) {
      cls.status = 'full';
    }

    const booking = {
      id: 'bk-' + Date.now(),
      classId: cls.id,
      className: cls.name,
      chef: cls.chef,
      date: cls.date,
      price: computeTotal(cls),
      rentEquipment: rentEquipmentCheckbox.checked,
      status: 'booked',
      rating: null,
    };
    bookings.push(booking);

    closeBookingModal();
    renderClasses();
    showToast('Вы записаны на класс «' + cls.name + '»');
  });

  function completeClass(bookingId) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    booking.status = 'completed';
    renderBookings();
    openRatingModal(bookingId);
  }

  function openRatingModal(bookingId) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    selectedBookingId = bookingId;
    ratingChefName.textContent = 'Шеф: ' + booking.chef;
    ratingThanks.hidden = true;
    setStarDisplay(booking.rating || 0);

    ratingModalOverlay.hidden = false;
  }

  function closeRatingModal() {
    ratingModalOverlay.hidden = true;
    selectedBookingId = null;
    renderBookings();
  }

  function setStarDisplay(value) {
    stars.forEach((star) => {
      const starValue = Number(star.dataset.value);
      const isActive = starValue <= value;
      star.classList.toggle('is-active', isActive);
      star.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  stars.forEach((star) => {
    star.addEventListener('mouseenter', () => {
      const hoverValue = Number(star.dataset.value);
      stars.forEach((s) => {
        s.classList.toggle('is-hover', Number(s.dataset.value) <= hoverValue);
      });
    });

    star.addEventListener('mouseleave', () => {
      stars.forEach((s) => s.classList.remove('is-hover'));
    });

    star.addEventListener('click', () => {
      const value = Number(star.dataset.value);
      const booking = bookings.find((b) => b.id === selectedBookingId);
      if (!booking) return;

      booking.rating = value;
      setStarDisplay(value);
      ratingThanks.hidden = false;

      setTimeout(() => {
        closeRatingModal();
      }, 900);
    });
  });

  ratingModalCloseBtn.addEventListener('click', closeRatingModal);
  ratingModalOverlay.addEventListener('click', (e) => {
    if (e.target === ratingModalOverlay) closeRatingModal();
  });

  renderClasses();
  renderBookings();
})();