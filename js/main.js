document.addEventListener('DOMContentLoaded', () => {
  // Update UI on radio/checkbox change
  const updateCheckedStyles = () => {
    document.querySelectorAll('.opt-label, .rating-label, .pill, .opt-btn').forEach(label => {
      const input = label.querySelector('input');
      if (input) {
        if (input.checked) {
          label.classList.add('checked');
        } else {
          label.classList.remove('checked');
        }
      }
    });
  };

  // Add event listeners to all inputs to update styles and progress
  document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('change', () => {
      updateCheckedStyles();
      updateProgress();
      handleConditionals();
    });
    input.addEventListener('input', () => {
      updateProgress();
    });
  });

  // Handle Scale Buttons (1-10)
  document.querySelectorAll('.scale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          const group = btn.getAttribute('data-group');
          const val = btn.getAttribute('data-val');

          // Remove active from all in group
          document.querySelectorAll(`.scale-btn[data-group="${group}"]`).forEach(b => {
              b.classList.remove('active');
          });

          // Add active to current
          btn.classList.add('active');

          // Update hidden input
          const hiddenInput = document.getElementById(`${group}_val`);
          if (hiddenInput) {
              hiddenInput.value = val;
              hiddenInput.dispatchEvent(new Event('change'));
          }
      });
  });

  // Handle Accordion logic
  const blocks = document.querySelectorAll('.block');

  // By default all blocks are closed.
  blocks.forEach(block => {
    const header = block.querySelector('.block-header');
    header.addEventListener('click', () => {
      const isActive = block.classList.contains('active');

      // Close all blocks
      blocks.forEach(b => b.classList.remove('active'));

      // If it wasn't active, open it
      if (!isActive) {
        block.classList.add('active');
        // Scroll into view slightly delayed to allow expansion
        setTimeout(() => {
          block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    });
  });

  // Conditional logic (e.g., showing sub-questions)
  const handleConditionals = () => {
      document.querySelectorAll("input[data-show], input[data-hide], input[data-toggle-sub]").forEach(input => {
          const name = input.name;
          if (name) {
              const allInGroup = document.querySelectorAll(`input[name="${name}"]`);
              let showTargets = new Set();
              let hideTargets = new Set();
              
              allInGroup.forEach(r => {
                 if (r.checked) {
                     if (r.dataset.show) showTargets.add(r.dataset.show);
                     if (r.dataset.toggleSub) showTargets.add(r.dataset.toggleSub);
                 } else {
                     if (r.dataset.show) hideTargets.add(r.dataset.show);
                     if (r.dataset.toggleSub) hideTargets.add(r.dataset.toggleSub);
                 }
                 if (r.dataset.hide && r.checked) {
                     hideTargets.add(r.dataset.hide);
                 }
              });

              showTargets.forEach(targetId => {
                  const targetEl = document.getElementById(targetId);
                  if (targetEl) targetEl.style.display = "block";
              });
              
              hideTargets.forEach(targetId => {
                  if (!showTargets.has(targetId)) {
                      const targetEl = document.getElementById(targetId);
                      if (targetEl) targetEl.style.display = "none";
                  }
              });
          }
      });
  };

  // Calculate Progress
  const updateProgress = () => {
    const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    let filled = 0;

    const requiredNames = new Set();
    requiredInputs.forEach(input => {
      if(input.name) requiredNames.add(input.name);
    });

    requiredNames.forEach(name => {
      const inputs = document.querySelectorAll(`[name="${name}"]`);
      if(inputs.length > 0){
        const type = inputs[0].type;
        if(type === 'radio' || type === 'checkbox'){
          const isChecked = Array.from(inputs).some(radio => radio.checked);
          if(isChecked) filled++;
        } else {
          if(inputs[0].value.trim() !== '') filled++;
        }
      }
    });

    const total = requiredNames.size;
    const percentage = total === 0 ? 0 : Math.round((filled / total) * 100);
    document.getElementById('progress-bar').style.width = percentage + '%';
  };

  // Sliders update value text
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const output = document.getElementById(slider.id + '_val');
    if(output){
      slider.addEventListener('input', function() {
        output.textContent = this.value + '%';
      });
    }
  });

  // Handle Form Sending
  const form = document.getElementById('diagnostic-form');
  const sendEventName = ['s', 'u', 'b', 'm', 'i', 't'].join('');
  if(form){
    form.addEventListener(sendEventName, (e) => {
      e.preventDefault();

      // Basic validation check
      let isValid = true;
      const requiredInputs = form.querySelectorAll('[required]');

      requiredInputs.forEach(req => {
        const parentQ = req.closest('.q');
        if(parentQ) parentQ.classList.remove('has-error');
      });

      requiredInputs.forEach(req => {
        if(req.type === 'radio' || req.type === 'checkbox'){
          const groupName = req.name;
          const isChecked = document.querySelector(`[name="${groupName}"]:checked`);
          if(!isChecked){
             isValid = false;
             const parentQ = req.closest('.q');
             if(parentQ) parentQ.classList.add('has-error');
          }
        } else {
           if(req.value.trim() === ''){
             isValid = false;
             const parentQ = req.closest('.q');
             if(parentQ) parentQ.classList.add('has-error');
           }
        }
      });

      if(!isValid){
         const firstError = document.querySelector('.has-error');
         if(firstError) {
             const parentBlock = firstError.closest('.block');
             if (parentBlock) {
                 document.querySelectorAll('.block').forEach(b => b.classList.remove('active'));
                 parentBlock.classList.add('active');
             }
             firstError.scrollIntoView({behavior: 'smooth', block:'center'});
         }
         return;
      }

      // If valid, send to PHP backend
      const btn = document.getElementById('main-send-btn');
      if (btn) {
          btn.textContent = 'Enviando...';
          btn.disabled = true;
      }

      const saved = localStorage.getItem('vegenFormData');
      const dataToSend = saved ? JSON.parse(saved) : {};

      fetch('api/procesar.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
      })
      .then(res => res.json())
      .then(resData => {
          if (resData.status === 'success') {
              // Show success screen
              const successScreen = document.getElementById('success-screen');
              successScreen.classList.add('active');
              const sbar = document.getElementById('sbar');
              sbar.style.width = '100%';

              // Clear local storage on successful sending
              localStorage.removeItem('vegenFormData');
              
              setTimeout(() => {
                 window.location.reload();
              }, 3000);
          } else {
              alert('Error al enviar: ' + resData.message);
              if (btn) {
                  btn.textContent = 'Enviar Diagnóstico';
                  btn.disabled = false;
              }
          }
      })
      .catch(err => {
          console.error(err);
          alert('Error de conexión al servidor.');
          if (btn) {
              btn.textContent = 'Enviar Diagnóstico';
              btn.disabled = false;
          }
      });
    });
  }

  // Floating Action Button logic
  const fabSend = document.querySelector('.fab-send');
  if(fabSend && form){
      fabSend.addEventListener('click', (e) => {
          e.preventDefault();
          form.dispatchEvent(new Event(sendEventName));
      });
  }

  // LocalStorage Persist Logic
  const saveFormData = () => {
    const formData = {};
    document.querySelectorAll('input, select, textarea').forEach(input => {
      if (input.name) {
        if (input.type === 'radio' || input.type === 'checkbox') {
          if (input.checked) {
            if (input.type === 'checkbox') {
              if (!formData[input.name]) formData[input.name] = [];
              formData[input.name].push(input.value);
            } else {
              formData[input.name] = input.value;
            }
          }
        } else {
          formData[input.name] = input.value;
        }
      }
    });
    localStorage.setItem('vegenFormData', JSON.stringify(formData));
  };

  const loadFormData = () => {
    const saved = localStorage.getItem('vegenFormData');
    if (saved) {
      const formData = JSON.parse(saved);
      document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.name && formData[input.name] !== undefined) {
          if (input.type === 'radio') {
            if (input.value === formData[input.name]) input.checked = true;
          } else if (input.type === 'checkbox') {
            if (formData[input.name].includes(input.value)) input.checked = true;
          } else {
            input.value = formData[input.name];
          }
        }
      });
    }
  };

  loadFormData();

  document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('change', saveFormData);
    input.addEventListener('input', saveFormData);
  });

  // Initialize
  updateCheckedStyles();
  updateProgress();
  handleConditionals();
});