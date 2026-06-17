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

  // Open the first block by default
  if(blocks.length > 0) {
    blocks[0].classList.add('active');
  }

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
    // Example: q08 has website
    const q08Si = document.getElementById('q08_si');
    const q08Sub = document.getElementById('q08_sub');
    if (q08Si && q08Sub) {
      if (q08Si.checked) {
        q08Sub.classList.add('active');
      } else {
        q08Sub.classList.remove('active');
      }
    }

    // Example: q09 has GBP
    const q09Si = document.getElementById('q09_si');
    const q09Sub = document.getElementById('q09_sub');
    if(q09Si && q09Sub){
        if(q09Si.checked) q09Sub.classList.add('active');
        else q09Sub.classList.remove('active');
    }

    // You can add more conditionals here based on the IDs used in HTML
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