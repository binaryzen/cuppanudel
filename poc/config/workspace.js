// poc/config/workspace.js
//
// Workspace-level export and import orchestration.
// Drives serialization by delegating to component exportConfig/importConfig methods.
// Handles file-drop import with size-gating, YAML/JSON parsing, validation, and confirmation.

import { validateAndApply, serialize } from './property-mapper.js';

// Deep equality for confirmation dialog decision.
// Scalars: strict ===
// Floats: tolerance |a - b| < 1e-6
// Arrays: recursive element-wise comparison
function deepEqual(a, b) {
	if (typeof a === 'number' && typeof b === 'number') {
		// Both numbers: use float tolerance
		return Math.abs(a - b) < 1e-6;
	}
	if (typeof a !== typeof b) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((val, i) => deepEqual(val, b[i]));
	}
	// Scalars: strict ===
	return a === b;
}

// Helper: create and show an error toast.
function showErrorToast(message) {
	const toast = document.createElement('div');
	toast.style.cssText = `
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		background: #933;
		color: #fff;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		font-size: 0.9rem;
		z-index: 9999;
		max-width: 80%;
		word-wrap: break-word;
	`;
	toast.textContent = message;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 3000);
}

// Helper: show a confirmation dialog.
// Returns a Promise that resolves to true (Apply) or false (Cancel).
function showConfirmationDialog() {
	return new Promise((resolve) => {
		const overlay = document.createElement('div');
		overlay.style.cssText = `
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.7);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 9998;
		`;

		const dialog = document.createElement('div');
		dialog.style.cssText = `
			background: #222;
			border: 1px solid #444;
			padding: 1.5rem;
			border-radius: 4px;
			color: #eee;
			max-width: 400px;
			text-align: center;
		`;

		const message = document.createElement('p');
		message.style.marginBottom = '1.5rem';
		message.textContent = 'Import workspace? This will replace your current settings.';

		const buttonGroup = document.createElement('div');
		buttonGroup.style.cssText = 'display: flex; gap: 0.75rem; justify-content: center;';

		const applyBtn = document.createElement('button');
		applyBtn.textContent = 'Apply';
		applyBtn.onclick = () => {
			overlay.remove();
			resolve(true);
		};

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.onclick = () => {
			overlay.remove();
			resolve(false);
		};

		buttonGroup.appendChild(applyBtn);
		buttonGroup.appendChild(cancelBtn);
		dialog.appendChild(message);
		dialog.appendChild(buttonGroup);
		overlay.appendChild(dialog);
		document.body.appendChild(overlay);
	});
}

// Helper: show an error panel listing validation errors.
function showErrorPanel(errors) {
	const overlay = document.createElement('div');
	overlay.style.cssText = `
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9998;
	`;

	const dialog = document.createElement('div');
	dialog.style.cssText = `
		background: #222;
		border: 1px solid #933;
		padding: 1.5rem;
		border-radius: 4px;
		color: #eee;
		max-width: 500px;
		max-height: 70vh;
		overflow-y: auto;
	`;

	const title = document.createElement('h3');
	title.style.cssText = 'margin-bottom: 1rem; color: #f88;';
	title.textContent = 'Import Errors';

	const list = document.createElement('ul');
	list.style.cssText = 'list-style: none; font-size: 0.9rem; line-height: 1.6;';
	errors.forEach((err) => {
		const li = document.createElement('li');
		li.textContent = err;
		li.style.cssText = 'color: #f88; margin-bottom: 0.5rem;';
		list.appendChild(li);
	});

	const closeBtn = document.createElement('button');
	closeBtn.textContent = 'Close';
	closeBtn.style.marginTop = '1.5rem';
	closeBtn.onclick = () => overlay.remove();

	dialog.appendChild(title);
	dialog.appendChild(list);
	dialog.appendChild(closeBtn);
	overlay.appendChild(dialog);
	document.body.appendChild(overlay);
}

// Assembles and serialises the full workspace to a YAML string.
// Always writes all sections explicitly (including empty sampleSets: [] and presets: []).
// Adds version: 1 at the top level.
function exportWorkspace(components, jsyaml) {
	const workspaceObj = {
		version: 1,
	};

	// Call each component's exportConfig in any order (sections are independent)
	if (components.global) {
		workspaceObj.global = components.global.exportConfig();
	}
	if (components.metronome) {
		workspaceObj.metronome = components.metronome.exportConfig();
	}
	if (components.sampleSets) {
		workspaceObj.sampleSets = components.sampleSets.exportConfig();
	}
	if (components.presets) {
		workspaceObj.presets = components.presets.exportConfig();
	}

	return jsyaml.dump(workspaceObj);
}

// Triggers a browser file download of the workspace as 'workspace.yaml'.
function downloadWorkspace(components, jsyaml) {
	const yaml = exportWorkspace(components, jsyaml);
	const blob = new Blob([yaml], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'workspace.yaml';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// Writes the workspace YAML string to the clipboard via navigator.clipboard.writeText.
// Returns a Promise that rejects if clipboard write fails.
function copyWorkspace(components, jsyaml) {
	const yaml = exportWorkspace(components, jsyaml);
	return navigator.clipboard.writeText(yaml);
}

// Parses and applies a workspace from text.
// Returns true if workspace was applied, false if cancelled, rejects on hard error.
async function importWorkspace(text, filename, fileSize, components, jsyaml) {
	// Size check
	if (fileSize > 1_048_576) {
		showErrorToast('File too large for a workspace config');
		return false;
	}

	let parsed;
	try {
		// Parse by filename extension
		if (filename.endsWith('.json')) {
			parsed = JSON.parse(text);
		} else {
			parsed = jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA });
		}
	} catch (error) {
		showErrorToast(error.message || 'Parse error');
		return false;
	}

	// If not an object, reject
	if (typeof parsed !== 'object' || parsed === null) {
		showErrorToast('Workspace must be a YAML/JSON object');
		return false;
	}

	// Check version
	if (parsed.version !== 1) {
		if (parsed.version !== undefined) {
			console.warn(`Unknown workspace version: ${parsed.version}`);
		}
	}

	// Validate each section via validateAndApply
	const validationErrors = [];
	const sectionsToApply = [];

	// Import order: sampleSets -> global -> metronome -> presets
	const importOrder = [
		{ key: 'sampleSets', component: components.sampleSets },
		{ key: 'global', component: components.global },
		{ key: 'metronome', component: components.metronome },
		{ key: 'presets', component: components.presets },
	];

	for (const { key, component } of importOrder) {
		if (!component || !(key in parsed)) {
			continue; // Skip missing sections
		}

		const slice = parsed[key];
		if (typeof slice !== 'object' || slice === null) {
			validationErrors.push(`${key}: must be an object`);
			continue;
		}

		// Delegate to component.importConfig for validation
		const errors = component.importConfig(slice);
		if (errors.length > 0) {
			validationErrors.push(...errors);
		} else {
			sectionsToApply.push({ key, component, slice });
		}
	}

	// If any errors, show them and stop
	if (validationErrors.length > 0) {
		showErrorPanel(validationErrors);
		return false;
	}

	// Deep equality check: see if anything differs from current state
	let anyDifference = false;
	for (const { key, component, slice } of sectionsToApply) {
		const current = component.exportConfig();
		if (!deepEqual(current, slice)) {
			anyDifference = true;
			break;
		}
	}

	// Show confirmation if anything differs
	if (anyDifference) {
		const confirmed = await showConfirmationDialog();
		if (!confirmed) {
			return false;
		}
	}

	// Apply each section by re-calling importConfig in order
	// (importConfig does the actual write; we've already validated)
	for (const { key, component, slice } of sectionsToApply) {
		component.importConfig(slice);
	}

	return true;
}

// Registers document-level dragover + drop listeners for workspace files.
// Returns an unregister function.
function registerDropTarget(components, jsyaml) {
	const handleDragOver = (e) => {
		if (e.dataTransfer.types.includes('Files')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
		}
	};

	const handleDrop = async (e) => {
		if (!e.dataTransfer.files.length) return;

		const file = e.dataTransfer.files[0];
		const ext = file.name.toLowerCase();
		if (!ext.endsWith('.yaml') && !ext.endsWith('.yml') && !ext.endsWith('.json')) {
			return; // Ignore non-workspace files
		}

		e.preventDefault();

		try {
			const text = await file.text();
			await importWorkspace(text, file.name, file.size, components, jsyaml);
		} catch (error) {
			showErrorToast(error.message || 'Error reading file');
		}
	};

	document.addEventListener('dragover', handleDragOver);
	document.addEventListener('drop', handleDrop);

	return () => {
		document.removeEventListener('dragover', handleDragOver);
		document.removeEventListener('drop', handleDrop);
	};
}

export {
	exportWorkspace,
	downloadWorkspace,
	copyWorkspace,
	importWorkspace,
	registerDropTarget,
};
