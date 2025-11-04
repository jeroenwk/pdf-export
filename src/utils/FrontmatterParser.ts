// Parse frontmatter from markdown content
export interface ParsedFrontmatter {
	properties: Record<string, any>;
	content: string;
}

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
	console.log('[PROPERTIES DEBUG] Parsing frontmatter from markdown content');
	console.log(`[PROPERTIES DEBUG] Raw content length: ${markdown.length} characters`);

	// Check if content starts with frontmatter delimiter
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
	const match = markdown.match(frontmatterRegex);

	if (!match) {
		console.log('[PROPERTIES DEBUG] No frontmatter found in content');
		return { properties: {}, content: markdown };
	}

	console.log('[PROPERTIES DEBUG] Frontmatter found, parsing YAML content');
	const frontmatterText = match[1];
	const contentWithoutFrontmatter = markdown.slice(match[0].length);

	console.log(`[PROPERTIES DEBUG] Frontmatter text: "${frontmatterText}"`);
	console.log(`[PROPERTIES DEBUG] Content after frontmatter: ${contentWithoutFrontmatter.length} characters`);

	// Enhanced YAML parser for key-value pairs and arrays
	const properties: Record<string, any> = {};
	const lines = frontmatterText.split('\n');
	let currentKey: string | null = null;
	let isInArray = false;
	let arrayItems: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		if (!trimmedLine || trimmedLine.startsWith('#')) continue;

		const colonIndex = trimmedLine.indexOf(':');

		// Handle array continuation (lines starting with -)
		if (trimmedLine.startsWith('-')) {
			if (!currentKey || !isInArray) {
				console.log(`[PROPERTIES DEBUG] Warning: Array item without context: ${trimmedLine}`);
				continue;
			}

			const arrayItem = trimmedLine.substring(1).trim();
			// Remove quotes if present
			if ((arrayItem.startsWith('"') && arrayItem.endsWith('"')) ||
				(arrayItem.startsWith("'") && arrayItem.endsWith("'"))) {
				arrayItems.push(arrayItem.slice(1, -1));
			} else {
				arrayItems.push(arrayItem);
			}
			continue;
		}

		// If we were building an array, finish it now
		if (isInArray && currentKey) {
			properties[currentKey] = arrayItems;
			console.log(`[PROPERTIES DEBUG] Parsed array property: ${currentKey} = [${arrayItems.join(', ')}]`);
			currentKey = null;
			isInArray = false;
			arrayItems = [];
		}

		// Handle regular key-value pairs
		if (colonIndex > 0) {
			const key = trimmedLine.substring(0, colonIndex).trim();
			const value = trimmedLine.substring(colonIndex + 1).trim();

			// Check if this is an array start (empty value after colon)
			if (value === '') {
				// Look ahead to see if next line starts with array items
				if (i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
					currentKey = key;
					isInArray = true;
					arrayItems = [];
					continue;
				}
			}

			// Handle regular scalar values
			let finalValue = value;

			// Check if it's an inline array (starts with [ and ends with ])
			if (value.startsWith('[') && value.endsWith(']')) {
				try {
					// Parse the inline array
					const arrayContent = value.slice(1, -1).trim();
					if (arrayContent === '') {
						properties[key] = [];
					} else {
						// Split by comma and clean each item
						const items = arrayContent.split(',').map(item => {
							const cleanedItem = item.trim();
							// Remove quotes if present
							if ((cleanedItem.startsWith('"') && cleanedItem.endsWith('"')) ||
								(cleanedItem.startsWith("'") && cleanedItem.endsWith("'"))) {
								return cleanedItem.slice(1, -1);
							}
							return cleanedItem;
						});
						properties[key] = items;
					}
					console.log(`[PROPERTIES DEBUG] Parsed inline array property: ${key} = [${properties[key].join(', ')}]`);
					continue;
				} catch (e) {
					console.log(`[PROPERTIES DEBUG] Failed to parse inline array for ${key}, treating as string: ${value}`);
				}
			}

			// Remove quotes if present
			if ((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))) {
				finalValue = value.slice(1, -1);
			}

			// Convert to appropriate type
			if (finalValue === 'true' || finalValue === 'false') {
				properties[key] = finalValue === 'true';
			} else if (!isNaN(Number(finalValue)) && finalValue !== '') {
				properties[key] = Number(finalValue);
			} else {
				properties[key] = finalValue;
			}

			console.log(`[PROPERTIES DEBUG] Parsed property: ${key} = ${properties[key]} (${typeof properties[key]})`);
		}
	}

	// Handle case where file ends while still in array
	if (isInArray && currentKey) {
		properties[currentKey] = arrayItems;
		console.log(`[PROPERTIES DEBUG] Parsed final array property: ${currentKey} = [${arrayItems.join(', ')}]`);
	}

	console.log(`[PROPERTIES DEBUG] Total properties parsed: ${Object.keys(properties).length}`);
	return { properties, content: contentWithoutFrontmatter };
}

// Helper function to insert properties table after title
export function insertPropertiesTableAfterTitle(containerEl: HTMLElement, propertiesTableHTML: string): void {
	console.log('[PROPERTIES DEBUG] Inserting properties table after title');

	const propertiesDiv = document.createElement('div');
	propertiesDiv.innerHTML = propertiesTableHTML;

	// Try to find h1, h2, h3, or any heading element
	const titleElement = containerEl.querySelector('h1, h2, h3, h4, h5, h6');

	if (titleElement) {
		console.log(`[PROPERTIES DEBUG] Found title element: ${titleElement.tagName} - inserting after it`);
		titleElement.parentNode?.insertBefore(propertiesDiv, titleElement.nextSibling);
	} else {
		// If no title found, insert at the beginning
		console.log('[PROPERTIES DEBUG] No title element found - inserting at beginning');
		containerEl.insertBefore(propertiesDiv, containerEl.firstChild);
	}
}

// Generate HTML table from properties
export function generatePropertiesTable(properties: Record<string, any>): string {
	console.log('[PROPERTIES DEBUG] Generating properties table HTML');
	console.log(`[PROPERTIES DEBUG] Properties count: ${Object.keys(properties).length}`);

	if (Object.keys(properties).length === 0) {
		console.log('[PROPERTIES DEBUG] No properties to generate table from');
		return '';
	}

	const propertyRows = Object.entries(properties)
		.map(([key, value]) => {
			const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

			// Format value based on its type
			let displayValue: string;
			if (Array.isArray(value)) {
				displayValue = value.join(', ');
				console.log(`[PROPERTIES DEBUG] Table row: ${displayKey} = [${displayValue}] (array)`);
			} else if (typeof value === 'boolean') {
				displayValue = value ? 'Yes' : 'No';
				console.log(`[PROPERTIES DEBUG] Table row: ${displayKey} = ${displayValue} (boolean)`);
			} else {
				displayValue = String(value);
				console.log(`[PROPERTIES DEBUG] Table row: ${displayKey} = ${displayValue} (${typeof value})`);
			}

			return `
				<tr>
					<td style="font-weight: 600; color: #666; padding: 4px 8px; font-size: 11px; width: 40%;">${displayKey}:</td>
					<td style="color: #333; padding: 4px 8px; font-size: 11px; width: 60%;">${displayValue}</td>
				</tr>
			`;
		})
		.join('');

	const tableHTML = `
		<table class="properties-table" style="width: 100%; border-collapse: collapse; margin: 8px 0 16px 0; font-size: 11px;">
			<tbody>
				${propertyRows}
			</tbody>
		</table>
	`;

	console.log('[PROPERTIES DEBUG] Properties table HTML generated successfully');
	return tableHTML;
}