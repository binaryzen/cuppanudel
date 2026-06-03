// poc/ui/edit-config-modal.js
//
// Singleton modal dialog for editing a component's YAML config.
// Pre-fills textarea with exportConfig() output.
// Provides Apply (parse+validate+apply), Cancel, and Copy actions.

let modalInstance = null;

function createEditConfigModal() {
	if (modalInstance) {
		return modalInstance;
	}

	// Create the singleton modal
	const overlay = document.createElement('div');
	overlay.id = 'edit-config-modal';
	overlay.style.cssText = `
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 600;
	`;

	const dialog = document.createElement('div');
	dialog.style.cssText = `
		background: #222;
		border: 1px solid #444;
		padding: 1.5rem;
		border-radius: 4px;
		color: #eee;
		max-width: 600px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	`;

	const title = document.createElement('h2');
	title.style.cssText = 'margin: 0; font-size: 1.1rem;';
	title.textContent = 'Edit Config';

	const textarea = document.createElement('textarea');
	textarea.style.cssText = `
		flex: 1;
		min-height: 200px;
		min-width: 320px;
		font-family: monospace;
		font-size: 0.9rem;
		padding: 0.75rem;
		background: #1a1a1a;
		color: #eee;
		border: 1px solid #444;
		resize: both;
		overflow: auto;
	`;

	const errorContainer = document.createElement('div');
	errorContainer.style.cssText = `
		background: #300;
		border: 1px solid #933;
		border-radius: 4px;
		padding: 0.75rem;
		color: #f88;
		font-size: 0.9rem;
		line-height: 1.5;
		display: none;
		max-height: 200px;
		overflow-y: auto;
	`;

	const buttonGroup = document.createElement('div');
	buttonGroup.style.cssText = 'display: flex; gap: 0.75rem; justify-content: flex-end;';

	const applyBtn = document.createElement('button');
	applyBtn.textContent = 'Apply';
	applyBtn.style.minWidth = '80px';

	const cancelBtn = document.createElement('button');
	cancelBtn.textContent = 'Cancel';
	cancelBtn.style.minWidth = '80px';

	const copyBtn = document.createElement('button');
	copyBtn.textContent = 'Copy';
	copyBtn.style.minWidth = '80px';

	buttonGroup.appendChild(applyBtn);
	buttonGroup.appendChild(copyBtn);
	buttonGroup.appendChild(cancelBtn);

	dialog.appendChild(title);
	dialog.appendChild(textarea);
	dialog.appendChild(errorContainer);
	dialog.appendChild(buttonGroup);
	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	// Modal state
	let currentComponent = null;
	let isOpen = false;

	// Event handlers
	const handleApply = () => {
		if (!currentComponent) return;

		let parsed;
		try {
			// Use jsyaml if available globally
			if (typeof window !== 'undefined' && window.jsyaml) {
				parsed = window.jsyaml.load(textarea.value, { schema: window.jsyaml.CORE_SCHEMA });
			} else {
				// Fallback to JSON (for tests)
				parsed = JSON.parse(textarea.value);
			}
		} catch (error) {
			errorContainer.style.display = 'block';
			errorContainer.textContent = `Parse error: ${error.message}`;
			return;
		}

		// Call component.importConfig to validate and apply
		const errors = currentComponent.importConfig(parsed);
		if (errors.length > 0) {
			errorContainer.style.display = 'block';
			errorContainer.innerHTML = errors.map((e) => `<div>${e}</div>`).join('');
			return;
		}

		// Success: close modal
		errorContainer.style.display = 'none';
		close();
	};

	const handleCancel = () => {
		close();
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(textarea.value);
		} catch (error) {
			errorContainer.style.display = 'block';
			errorContainer.textContent = `Copy failed: ${error.message}`;
		}
	};

	const handleEscape = (e) => {
		if (e.key === 'Escape' && isOpen) {
			handleCancel();
		}
	};

	const handleCtrlEnter = (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isOpen) {
			handleApply();
		}
	};

	applyBtn.addEventListener('click', handleApply);
	cancelBtn.addEventListener('click', handleCancel);
	copyBtn.addEventListener('click', handleCopy);
	document.addEventListener('keydown', handleEscape);
	document.addEventListener('keydown', handleCtrlEnter);

	// Close when clicking outside the dialog
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay && isOpen) {
			handleCancel();
		}
	});

	function open(component) {
		currentComponent = component;
		isOpen = true;

		// Pre-fill textarea with current config
		const config = component.exportConfig();
		if (typeof window !== 'undefined' && window.jsyaml) {
			textarea.value = window.jsyaml.dump(config);
		} else {
			textarea.value = JSON.stringify(config, null, 2);
		}

		// Clear any previous errors
		errorContainer.style.display = 'none';
		errorContainer.innerHTML = '';

		// Show modal
		overlay.style.display = 'flex';
		textarea.focus();
	}

	function close() {
		isOpen = false;
		currentComponent = null;
		overlay.style.display = 'none';
		errorContainer.style.display = 'none';
		errorContainer.innerHTML = '';
	}

	function getIsOpen() {
		return isOpen;
	}

	modalInstance = {
		open,
		close,
		isOpen: getIsOpen,
	};

	return modalInstance;
}

export { createEditConfigModal };
