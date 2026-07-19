/* ====== Общий скрипт для всех страниц сайта "Интернет рядом" ====== */
(function(){
  'use strict';

  /* Год в футере */
  var yearEl = document.getElementById('year');
  if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

  /* Эффект тени шапки при скролле */
  var header = document.querySelector('header.site');
  if(header){
    window.addEventListener('scroll', function(){
      if(window.pageYOffset > 50){ header.classList.add('scrolled'); }
      else{ header.classList.remove('scrolled'); }
    }, {passive:true});
  }

  /* Выпадающее меню навигации по станицам */
  var navDropdown = document.querySelector('.nav-dropdown');
  if(navDropdown){
    var toggle = navDropdown.querySelector('.nav-dropdown-toggle');
    if(toggle){
      toggle.addEventListener('click', function(e){
        e.preventDefault();
        navDropdown.classList.toggle('open');
      });
      document.addEventListener('click', function(e){
        if(!navDropdown.contains(e.target)){ navDropdown.classList.remove('open'); }
      });
    }
  }

  /* Мобильное меню (гамбургер) */
  var burgerBtn = document.getElementById('burgerBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  var menuBackdrop = document.getElementById('menuBackdrop');

  function closeMobileMenu(){
    if(burgerBtn){ burgerBtn.setAttribute('aria-expanded', 'false'); }
    if(mobileMenu){ mobileMenu.classList.remove('open'); }
    if(menuBackdrop){ menuBackdrop.classList.remove('open'); }
    document.body.classList.remove('menu-open');
  }
  function openMobileMenu(){
    if(burgerBtn){ burgerBtn.setAttribute('aria-expanded', 'true'); }
    if(mobileMenu){ mobileMenu.classList.add('open'); }
    if(menuBackdrop){ menuBackdrop.classList.add('open'); }
    document.body.classList.add('menu-open');
  }
  if(burgerBtn && mobileMenu){
    burgerBtn.addEventListener('click', function(){
      var isOpen = burgerBtn.getAttribute('aria-expanded') === 'true';
      if(isOpen){ closeMobileMenu(); } else { openMobileMenu(); }
    });
  }
  if(menuBackdrop){
    menuBackdrop.addEventListener('click', closeMobileMenu);
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeMobileMenu(); }
  });
  if(mobileMenu){
    /* Закрываем меню при клике по любой ссылке внутри него */
    mobileMenu.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){ closeMobileMenu(); });
    });
    /* Аккордеон "Населённые пункты" внутри мобильного меню */
    var mobileDropdown = mobileMenu.querySelector('.mobile-nav-dropdown');
    if(mobileDropdown){
      var mobileToggle = mobileDropdown.querySelector('.mobile-nav-dropdown-toggle');
      if(mobileToggle){
        mobileToggle.addEventListener('click', function(){
          mobileDropdown.classList.toggle('open');
        });
      }
    }
  }
  /* Автозакрытие мобильного меню при увеличении окна до десктопной ширины */
  window.addEventListener('resize', function(){
    if(window.innerWidth > 920){ closeMobileMenu(); }
  });

  /* Клик по населённому пункту в списке покрытия → выбор в форме */
  document.querySelectorAll('.settlement-link').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var val = this.dataset.settlement;
      var select = document.getElementById('settlement');
      if(select){
        for(var i = 0; i < select.options.length; i++){
          if(select.options[i].value === val || select.options[i].text === val){
            select.selectedIndex = i;
            break;
          }
        }
        var f = select.closest('.field');
        if(f){ f.classList.remove('invalid'); }
      }
      var form = document.getElementById('form');
      if(form){ form.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });

  /* Выбор роутера по клику на карточку */
  document.querySelectorAll('.btn-select-router').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var routerName = this.dataset.router;
      var routerSelect = document.getElementById('router');
      document.querySelectorAll('.router-card').forEach(function(card){
        card.classList.remove('selected');
      });
      var selectedCard = this.closest('.router-card');
      if(selectedCard){ selectedCard.classList.add('selected'); }
      if(routerSelect){
        for(var i = 0; i < routerSelect.options.length; i++){
          if(routerSelect.options[i].value === routerName){
            routerSelect.selectedIndex = i;
            break;
          }
        }
      }
      var form = document.getElementById('form');
      if(form){ form.scrollIntoView({behavior:'smooth', block:'start'}); }
      this.textContent = '✓ Выбран';
      var originalBtn = this;
      setTimeout(function(){ originalBtn.textContent = 'Выбрать'; }, 1500);
    });
  });

  /* Выбор тарифа по клику на карточку */
  document.querySelectorAll('.btn-select-tariff').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var tariffName = this.dataset.tariff;
      var tariffSelect = document.getElementById('tariff');
      document.querySelectorAll('.tariff-card').forEach(function(card){
        card.classList.remove('selected');
      });
      var selectedCard = this.closest('.tariff-card');
      if(selectedCard){ selectedCard.classList.add('selected'); }
      if(tariffSelect){
        for(var i = 0; i < tariffSelect.options.length; i++){
          if(tariffSelect.options[i].value === tariffName){
            tariffSelect.selectedIndex = i;
            break;
          }
        }
      }
      var form = document.getElementById('form');
      if(form){ form.scrollIntoView({behavior:'smooth', block:'start'}); }
      this.textContent = '✓ Выбран';
      var originalBtn = this;
      setTimeout(function(){ originalBtn.textContent = 'Выбрать тариф'; }, 1500);
    });
  });

  /* Копирование команды одним кликом (страница проверки скорости) */
  document.querySelectorAll('.code-copy-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var text = btn.getAttribute('data-copy') || '';
      var done = function(){
        var original = btn.getAttribute('data-label') || btn.textContent;
        btn.setAttribute('data-label', original);
        btn.textContent = 'Скопировано ✓';
        btn.classList.add('copied');
        setTimeout(function(){
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 1500);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done).catch(function(){});
      } else {
        var tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        try{ document.execCommand('copy'); done(); }catch(e){}
        document.body.removeChild(tmp);
      }
    });
  });

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    if(!q){ return; }
    q.addEventListener('click', function(){
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(i){ i.classList.remove('open'); });
      if(!wasOpen){ item.classList.add('open'); }
    });
  });
})();

/* ====== Логика формы (Web3Forms) ====== */
(function(){
  'use strict';

  var form = document.getElementById('leadForm');
  if(!form){ return; }

  /* Предзаполнение населённого пункта / тарифа / роутера из URL */
  var params = new URLSearchParams(window.location.search);
  var presetSettlement = params.get('settlement');
  var presetTariff = params.get('tariff');
  var presetRouter = params.get('router');

  function setSelectValue(selectId, val){
    if(!val){ return; }
    var el = document.getElementById(selectId);
    if(!el){ return; }
    for(var j = 0; j < el.options.length; j++){
      if(el.options[j].value === val || el.options[j].text === val){
        el.selectedIndex = j;
        break;
      }
    }
  }
  setSelectValue('settlement', presetSettlement);
  setSelectValue('tariff', presetTariff);
  setSelectValue('router', presetRouter);

  var statusBox = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');

  function setError(fieldEl, show){
    var wrap = fieldEl.closest('.field');
    if(wrap){ wrap.classList.toggle('invalid', show); }
  }

  function validatePhone(value){
    var digits = value.replace(/\D/g,'');
    return digits.length >= 10 && digits.length <= 12;
  }

  function validate(){
    var ok = true;

    var settlement = document.getElementById('settlement');
    if(settlement){
      var valid1 = settlement.value !== '';
      setError(settlement, !valid1); if(!valid1){ ok = false; }
    }

    var street = document.getElementById('street');
    if(street){
      var valid2 = street.value.trim().length > 1;
      setError(street, !valid2); if(!valid2){ ok = false; }
    }

    var house = document.getElementById('house');
    if(house){
      var valid3 = house.value.trim().length > 0;
      setError(house, !valid3); if(!valid3){ ok = false; }
    }

    var fio = document.getElementById('fio');
    if(fio){
      var valid4 = fio.value.trim().split(/\s+/).length >= 2;
      setError(fio, !valid4); if(!valid4){ ok = false; }
    }

    var phone = document.getElementById('phone');
    if(phone){
      var valid5 = validatePhone(phone.value);
      setError(phone, !valid5); if(!valid5){ ok = false; }
    }

    var consent = document.getElementById('consent');
    var consentErr = document.getElementById('consentErr');
    if(consent && consentErr){
      var valid6 = consent.checked;
      consentErr.style.display = valid6 ? 'none' : 'block';
      if(!valid6){ ok = false; }
    }

    return ok;
  }

  form.addEventListener('input', function(e){
    if(e.target.closest('.field')){
      e.target.closest('.field').classList.remove('invalid');
    }
    if(e.target.id === 'consent'){
      var consentErr = document.getElementById('consentErr');
      if(consentErr){ consentErr.style.display = 'none'; }
    }
  });

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(statusBox){
      statusBox.className = 'form-status';
      statusBox.textContent = '';
    }

    if(!validate()){
      if(statusBox){
        statusBox.textContent = 'Проверьте поля, отмеченные красным.';
        statusBox.classList.add('show','fail');
      }
      return;
    }

    /* Ключ Web3Forms берётся из скрытого поля в форме (access_key). */
    var accessKeyInput = form.querySelector('[name="access_key"]');
    if(!accessKeyInput || !accessKeyInput.value){
      if(statusBox){
        statusBox.textContent = 'Форма ещё не подключена к почте: нужно вставить Access Key от Web3Forms.';
        statusBox.classList.add('show','fail');
      }
      return;
    }

    if(submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем…';
    }

    var formData = new FormData(form);
    formData.append('subject', 'Новая заявка на подключение интернета');
    formData.append('from_name', 'Сайт — заявки на интернет');

    /* Формируем читаемое тело письма на русском */
    var settlementVal = document.getElementById('settlement');
    var streetVal = document.getElementById('street');
    var houseVal = document.getElementById('house');
    var fioVal = document.getElementById('fio');
    var phoneVal = document.getElementById('phone');
    var tariffSel = document.getElementById('tariff');
    var routerSel = document.getElementById('router');
    var pageInput = document.querySelector('input[name="page_source"]');
    var pageVal = (pageInput && pageInput.value) ? pageInput.value : location.pathname;

    var readableMessage =
      'Населённый пункт: ' + (settlementVal ? settlementVal.value : '') + '\n' +
      'Улица: ' + (streetVal ? streetVal.value : '') + '\n' +
      'Дом: ' + (houseVal ? houseVal.value : '') + '\n' +
      'ФИО: ' + (fioVal ? fioVal.value : '') + '\n' +
      'Телефон: ' + (phoneVal ? phoneVal.value : '') + '\n' +
      'Тариф: ' + (tariffSel && tariffSel.value ? tariffSel.value : 'Не выбран') + '\n' +
      'WiFi роутер: ' + (routerSel && routerSel.value ? routerSel.value : 'Не выбран') + '\n' +
      'Страница заявки: ' + pageVal;
    formData.append('message', readableMessage);

    try{
      var res = await fetch('https://api.web3forms.com/submit', {
        method:'POST',
        headers:{ 'Accept':'application/json' },
        body:formData
      });
      var data = await res.json();
      if(data.success){
        if(statusBox){
          statusBox.textContent = 'Заявка отправлена! Перезвоним в ближайшее время.';
          statusBox.classList.add('show','ok');
        }
        form.reset();
      } else {
        if(statusBox){
          statusBox.textContent = 'Не получилось отправить заявку. Попробуйте ещё раз чуть позже.';
          statusBox.classList.add('show','fail');
        }
      }
    } catch(err){
      if(statusBox){
        statusBox.textContent = 'Ошибка сети. Проверьте подключение и попробуйте снова.';
        statusBox.classList.add('show','fail');
      }
    } finally {
      if(submitBtn){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить заявку';
      }
    }
  });
})();
