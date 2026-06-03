// poc/ui/context-menu.js
//
// Lightweight right-click / long-press context menu for panel headers.
// Provides Copy Config, Paste Config, and Edit Config actions.

function createContextMenu(target, component, openModal) {
	let currentMenu = null;
	let longPressTimer = null;
	let hasMoved = false;
	let pointerStartX = 0;
	let pointerStartY = 0;

	function hideMenu() {
		if (currentMenu) {
			currentMenu.remove();
			currentMenu = null;
		}
	}

	function showMenu(x, y) {
		hideMenu(); // Close any existing menu first

		const menu = document.createElement('div');
		menu.style.cssText = `
			position: fixed;
			left: ${x}px;
			top: ${y}px;
			background: #222;
			border: 1px solid #444;
			border-radius: 4px;
			min-width: 150px;
			z-index: 9997;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
		`;

		// Copy Config item
		const copyItem = document.createElement('div');
		copyItem.textContent = 'Copy Config';
		copyItem.style.cssText = `
			padding: 0.5rem 1rem;
			cursor: pointer;
			user-select: none;
		`;
		copyItem.onmouseenter = () => (copyItem.style.background = '#333');
		copyItem.onmouseleave = () => (copyItem.style.background = '');
		copyItem.onclick = async () => {
			try {
				const config = component.exportConfig();
				if (typeof window !== 'undefined' && window.jsyaml) {
					const yaml = window.jsyaml.dump(config);
					await navigator.clipboard.writeText(yaml);
				} else {
					await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
				}
			} catch (error) {
				console.error('Copy failed:', error);
				// Show brief error toast
				const toast = document.createElement('div');
				toast.style.cssText = `
					position: fixed;
					bottom: 1rem;
					left: 50%;
					transform: translateX(-50%);
					background: #933;
					color: #fff;
					padding: 0.5rem 1rem;
					border-radius: 4px;
					font-size: 0.85rem;
					z-index: 9999;
				`;
				toast.textContent = 'Copy failed: ' + error.message;
				document.body.appendChild(toast);
				setTimeout(() => toast.remove(), 2000);
			}
			hideMenu();
		};

		// Paste Config item (only if clipboard available)
		if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
			const pasteItem = document.createElement('div');
			pasteItem.textContent = 'Paste Config';
			pasteItem.style.cssText = `
				padding: 0.5rem 1rem;
				cursor: pointer;
				user-select: none;
			`;
			pasteItem.onmouseenter = () => (pasteItem.style.background = '#333');
			pasteItem.onmouseleave = () => (pasteItem.style.background = '');
			pasteItem.onclick = async () => {
				try {
					const text = await navigator.clipboard.readText();
					let parsed;
					if (typeof window !== 'undefined' && window.jsyaml) {
						parsed = window.jsyaml.load(text, { schema: window.jsyaml.CORE_SCHEMA });
					} else {
						parsed = JSON.parse(text);
					}

					const errors = component.importConfig(parsed);
					if (errors.length > 0) {
						// Show inline error banner
						const errorBanner = document.createElement('div');
						errorBanner.style.cssText = `
							background: #300;
							border-top: 1px solid #933;
							padding: 0.5rem 1rem;
							color: #f88;
							font-size: 0.85rem;
							margin-top: 0.5rem;
						`;
						errorBanner.textContent = errors[0]; // Show first error
						menu.appendChild(errorBanner);
					} else {
						hideMenu();
					}
				} catch (error) {
					// Silent catch for NotAllowedError
					if (error.name === 'NotAllowedError') {
						// Do nothing — permission denied is normal
					} else {
						console.error('Paste failed:', error);
					}
					hideMenu();
				}
			};
			menu.appendChild(pasteItem);
		}

		// Edit Config item
		const editItem = document.createElement('div');
		editItem.textContent = 'Edit Config...';
		editItem.style.cssText = `
			padding: 0.5rem 1rem;
			cursor: pointer;
			user-select: none;
		`;
		editItem.onmouseenter = () => (editItem.style.background = '#333');
		editItem.onmouseleave = () => (editItem.style.background = '');
		editItem.onclick = () => {
			openModal(component);
			hideMenu();
		};

		menu.appendChild(copyItem);
		menu.appendChild(editItem);

		// Clamp menu to viewport (8 px margins)
		const rect = menu.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const margin = 8;

		let adjustedX = x;
		let adjustedY = y;

		// Adjust for right edge
		if (rect.right > viewportWidth - margin) {
			adjustedX = viewportWidth - rect.width - margin;
		}
		// Adjust for left edge
		if (adjustedX < margin) {
			adjustedX = margin;
		}

		// Adjust for bottom edge
		if (rect.bottom > viewportHeight - margin) {
			adjustedY = viewportHeight - rect.height - margin;
		}
		// Adjust for top edge
		if (adjustedY < margin) {
			adjustedY = margin;
		}

		menu.style.left = adjustedX + 'px';
		menu.style.top = adjustedY + 'px';

		document.body.appendChild(menu);
		currentMenu = menu;
	}

	function handleContextMenu(e) {
		e.preventDefault();
		showMenu(e.clientX, e.clientY);
	}

	function handlePointerDown(e) {
		hasMoved = false;
		pointerStartX = e.clientX;
		pointerStartY = e.clientY;

		longPressTimer = setTimeout(() => {
			if (!hasMoved) {
				showMenu(e.clientX, e.clientY);
			}
		}, 600);
	}

	function handlePointerMove(e) {
		const dx = e.clientX - pointerStartX;
		const dy = e.clientY - pointerStartY;
		if (Math.sqrt(dx * dx + dy * dy) > 20) {
			hasMoved = true;
			clearTimeout(longPressTimer);
		}
	}

	function handlePointerUp() {
		clearTimeout(longPressTimer);
	}

	// Document-level click to dismiss menu
	function handleDocumentClick(e) {
		if (currentMenu && !currentMenu.contains(e.target) && !target.contains(e.target)) {
			hideMenu();
		}
	}

	// Escape key to dismiss menu
	function handleEscape(e) {
		if (e.key === 'Escape' && currentMenu) {
			hideMenu();
		}
	}

	target.addEventListener('contextmenu', handleContextMenu);
	target.addEventListener('pointerdown', handlePointerDown);
	target.addEventListener('pointermove', handlePointerMove);
	target.addEventListener('pointerup', handlePointerUp);
	document.addEventListener('click', handleDocumentClick);
	document.addEventListener('keydown', handleEscape);

	function dispose() {
		target.removeEventListener('contextmenu', handleContextMenu);
		target.removeEventListener('pointerdown', handlePointerDown);
		target.removeEventListener('pointermove', handlePointerMove);
		target.removeEventListener('pointerup', handlePointerUp);
		document.removeEventListener('click', handleDocumentClick);
		document.removeEventListener('keydown', handleEscape);
		hideMenu();
	}

	return { dispose };
}

export { createContextMenu };
