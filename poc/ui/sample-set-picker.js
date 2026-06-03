// poc/ui/sample-set-picker.js
//
// UI component for choosing metronome click sounds via a dropdown picker
// and two-slot assignment flow for creating or selecting sample sets.
// Does NOT register providers or modify tc — that is main.js's responsibility.

import { createMediaPoolSampleProvider } from '../audio/media-pool-sample-provider.js';

/**
 * Creates the Click Sound UI component.
 *
 * @param {HTMLElement} target - container to render into
 * @param {Object} registry - SampleProviderRegistry (list(), get(id))
 * @param {Object} pool - MediaPool (clips[], getBuffer())
 * @param {Object} tc - TempoContext (clickProviderRef)
 * @param {Function} onProviderChange - callback(selectedId, newProvider) on confirmation
 * @returns {Object} SampleSetPickerController with update() and dispose()
 */
function createSampleSetPicker(target, registry, pool, tc, onProviderChange) {
  // Internal state
  let isDropdownOpen = false;
  let slotAssignmentState = null; // { name, slots: [{ index, clipId }] }
  let currentAssignmentSlot = 0; // which slot (0 or 1) is being assigned

  // DOM references
  let labelEl = null;
  let dropdownEl = null;
  let slotAssignmentEl = null;

  // Create the main UI structure
  function render() {
    // Clear target
    target.innerHTML = '';

    // Create label row (shows current provider)
    labelEl = document.createElement('div');
    labelEl.className = 'sample-set-picker-label';
    labelEl.textContent = getCurrentProviderLabel();
    labelEl.style.cursor = 'pointer';
    labelEl.addEventListener('click', toggleDropdown);
    target.appendChild(labelEl);

    // Create dropdown (hidden initially)
    dropdownEl = document.createElement('div');
    dropdownEl.className = 'sample-set-picker-dropdown';
    dropdownEl.style.display = 'none';
    target.appendChild(dropdownEl);

    // Create slot assignment view (hidden initially)
    slotAssignmentEl = document.createElement('div');
    slotAssignmentEl.className = 'sample-set-picker-slot-assignment';
    slotAssignmentEl.style.display = 'none';
    target.appendChild(slotAssignmentEl);
  }

  // Get the label of the currently active provider
  function getCurrentProviderLabel() {
    const currentId = tc.clickProviderRef;
    const provider = registry.get(currentId);
    if (provider) {
      return provider.label;
    }
    return 'Unknown provider';
  }

  // Toggle dropdown visibility
  function toggleDropdown() {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  // Open dropdown and populate it
  function openDropdown() {
    isDropdownOpen = true;
    dropdownEl.style.display = 'block';
    dropdownEl.innerHTML = '';

    // List all registered providers
    const providers = registry.list();
    providers.forEach(provider => {
      const item = document.createElement('div');
      item.className = 'sample-set-picker-dropdown-item';
      item.textContent = provider.label;
      item.addEventListener('click', () => {
        // Existing provider selected
        onProviderChange(provider.id, null);
        closeDropdown();
      });
      dropdownEl.appendChild(item);
    });

    // Add "New sample set…" option
    const newSetItem = document.createElement('div');
    newSetItem.className = 'sample-set-picker-dropdown-item sample-set-picker-new-set';
    newSetItem.textContent = 'New sample set…';
    newSetItem.addEventListener('click', startNewSampleSet);
    dropdownEl.appendChild(newSetItem);

    // Close dropdown on Escape or outside click
    document.addEventListener('keydown', handleDropdownEscape);
    document.addEventListener('click', handleOutsideClick);
  }

  // Close dropdown
  function closeDropdown() {
    isDropdownOpen = false;
    dropdownEl.style.display = 'none';
    slotAssignmentEl.style.display = 'none';
    slotAssignmentState = null;

    document.removeEventListener('keydown', handleDropdownEscape);
    document.removeEventListener('click', handleOutsideClick);
    if (slotAssignmentEscapeRegistered) {
      document.removeEventListener('keydown', handleSlotAssignmentEscape);
      slotAssignmentEscapeRegistered = false;
    }
  }

  // Handle Escape key in dropdown
  function handleDropdownEscape(event) {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  }

  // Handle outside click to close dropdown
  function handleOutsideClick(event) {
    if (!target.contains(event.target)) {
      closeDropdown();
    }
  }

  // Start the "New sample set" flow
  function startNewSampleSet() {
    const name = prompt('Enter a name for this sample set:');
    if (name === null || name.trim() === '') {
      // User cancelled or entered empty string
      return;
    }

    // Initialize state for two-slot assignment
    slotAssignmentState = {
      name: name.trim(),
      slots: [
        { index: 0, clipId: null },
        { index: 1, clipId: null },
      ],
    };
    currentAssignmentSlot = 0;

    // Show slot assignment UI
    renderSlotAssignment();
  }

  // Render the two-slot assignment view
  function renderSlotAssignment() {
    dropdownEl.style.display = 'none';
    slotAssignmentEl.style.display = 'block';
    slotAssignmentEl.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'sample-set-picker-assignment-header';
    header.textContent = `Create: ${slotAssignmentState.name}`;
    slotAssignmentEl.appendChild(header);

    // Render slot 0 (lo click)
    renderSlot(0);

    // Render slot 1 (hi click)
    renderSlot(1);

    // Render confirm button (disabled until both slots assigned)
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'sample-set-picker-confirm-btn';
    confirmBtn.textContent = 'Confirm';
    const bothAssigned =
      slotAssignmentState.slots[0].clipId !== null &&
      slotAssignmentState.slots[1].clipId !== null;
    confirmBtn.disabled = !bothAssigned;
    confirmBtn.addEventListener('click', confirmNewSampleSet);
    slotAssignmentEl.appendChild(confirmBtn);

    // Handle Escape to cancel slot assignment
    if (!slotAssignmentEscapeRegistered) {
      document.addEventListener('keydown', handleSlotAssignmentEscape);
      slotAssignmentEscapeRegistered = true;
    }
  }

  // Render a single slot assignment row
  function renderSlot(slotIndex) {
    const slotData = slotAssignmentState.slots[slotIndex];
    const slotLabel = slotIndex === 0 ? 'Lo click' : 'Hi click';

    const slotRow = document.createElement('div');
    slotRow.className = 'sample-set-picker-slot-row';

    const label = document.createElement('div');
    label.className = 'sample-set-picker-slot-label';
    label.textContent = slotLabel;
    slotRow.appendChild(label);

    const clipName = document.createElement('div');
    clipName.className = 'sample-set-picker-slot-clip-name';
    if (slotData.clipId) {
      const clip = pool.clips.find(c => c.id === slotData.clipId);
      clipName.textContent = clip ? clip.label : 'Unknown clip';
    } else {
      clipName.textContent = '(not assigned)';
    }
    clipName.style.cursor = 'pointer';
    clipName.addEventListener('click', () => openClipBrowser(slotIndex));
    slotRow.appendChild(clipName);

    slotAssignmentEl.appendChild(slotRow);
  }

  // Open clip browser for a specific slot
  function openClipBrowser(slotIndex) {
    currentAssignmentSlot = slotIndex;

    const browserEl = document.createElement('div');
    browserEl.className = 'sample-set-picker-clip-browser';

    // List all clips from pool
    if (pool.clips.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '(no clips in pool)';
      browserEl.appendChild(empty);
    } else {
      pool.clips.forEach(clip => {
        const clipItem = document.createElement('div');
        clipItem.className = 'sample-set-picker-clip-item';
        clipItem.textContent = clip.label;
        clipItem.addEventListener('click', () => {
          assignClipToSlot(slotIndex, clip.id);
          browserEl.remove();
          renderSlotAssignment();
        });
        browserEl.appendChild(clipItem);
      });
    }

    // Handle Escape to cancel selection
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        browserEl.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    slotAssignmentEl.appendChild(browserEl);
  }

  // Assign a clip to a slot
  function assignClipToSlot(slotIndex, clipId) {
    slotAssignmentState.slots[slotIndex].clipId = clipId;
  }

  // Handle Escape during slot assignment.
  // Stored in a variable so closeDropdown() and dispose() can remove it.
  function handleSlotAssignmentEscape(event) {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  }
  let slotAssignmentEscapeRegistered = false;

  // Confirm and create the new sample set provider
  function confirmNewSampleSet() {
    // Both slots must be assigned
    const bothAssigned =
      slotAssignmentState.slots[0].clipId !== null &&
      slotAssignmentState.slots[1].clipId !== null;

    if (!bothAssigned) {
      return; // button should be disabled, but just in case
    }

    // Create the new MediaPoolSampleProvider
    const providerId = `sample-set:${Date.now()}`;
    const newProvider = createMediaPoolSampleProvider(
      providerId,
      slotAssignmentState.name,
      slotAssignmentState.slots,
      pool
    );

    // Notify main.js to register and apply
    onProviderChange(providerId, newProvider);

    // Clean up
    closeDropdown();
  }

  // Public API
  const controller = {
    /**
     * Refreshes the displayed provider label from tc.clickProviderRef.
     */
    update() {
      if (labelEl) {
        labelEl.textContent = getCurrentProviderLabel();
      }
    },

    /**
     * Disposes all event listeners.
     */
    dispose() {
      document.removeEventListener('keydown', handleDropdownEscape);
      document.removeEventListener('click', handleOutsideClick);
      if (slotAssignmentEscapeRegistered) {
        document.removeEventListener('keydown', handleSlotAssignmentEscape);
        slotAssignmentEscapeRegistered = false;
      }
    },
  };

  // Initial render
  render();

  return controller;
}

export { createSampleSetPicker };
