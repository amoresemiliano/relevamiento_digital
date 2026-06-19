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
      // If clicking the already open block, close it? (Usually yes, but here let's toggle)
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
      // Find all inputs that control sub-questions
      document.querySelectorAll("input[data-show], input[data-hide], input[data-toggle-sub]").forEach(input => {
          // If the element was just changed and it is a radio, we evaluate all in its name group
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

    // Because radio groups have same name but multiple inputs, we need to count groups
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

  // Handle Form Submission
  const form = document.getElementById('diagnostic-form');
  if(form){
    form.addEventListener('submit', (e) => {
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
             // Find the block containing the error and open it
             const parentBlock = firstError.closest('.block');
             if (parentBlock) {
                 document.querySelectorAll('.block').forEach(b => b.classList.remove('active'));
                 parentBlock.classList.add('active');
             }
             firstError.scrollIntoView({behavior: 'smooth', block:'center'});
         }
         return;
      }

      // If valid, show success screen
      const successScreen = document.getElementById('success-screen');
      successScreen.classList.add('active');
      const sbar = document.getElementById('sbar');
      sbar.style.width = '100%';

      // Here you would normally do a fetch() to submit the data
      // For now, it just shows success
      setTimeout(() => {
         // Optional: redirect or reset
         // window.location.reload();
      }, 3000);
    });
  }

  // Floating Action Button logic
  const fabSubmit = document.querySelector('.fab-submit');
  if(fabSubmit && form){
      fabSubmit.addEventListener('click', (e) => {
          e.preventDefault();
          form.dispatchEvent(new Event('submit'));
      });
  }

  // Initialize
  updateCheckedStyles();
  updateProgress();
  handleConditionals();

});
