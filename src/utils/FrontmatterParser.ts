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

	// Simple YAML parser for key-value pairs
	const properties: Record<string, any> = {};
	const lines = frontmatterText.split('\n');

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine || trimmedLine.startsWith('#')) continue;

		const colonIndex = trimmedLine.indexOf(':');
		if (colonIndex > 0) {
			const key = trimmedLine.substring(0, colonIndex).trim();
			let value = trimmedLine.substring(colonIndex + 1).trim();

			// Remove quotes if present
			if ((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}

			// Convert to appropriate type
			if (value === 'true' || value === 'false') {
				properties[key] = value === 'true';
			} else if (!isNaN(Number(value)) && value !== '') {
				properties[key] = Number(value);
			} else {
				properties[key] = value;
			}

			console.log(`[PROPERTIES DEBUG] Parsed property: ${key} = ${properties[key]} (${typeof properties[key]})`);
		}
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
			console.log(`[PROPERTIES DEBUG] Table row: ${displayKey} = ${value}`);
			return `
				<tr>
					<td style="font-weight: 600; color: #666; padding: 4px 8px; font-size: 11px; width: 40%;">${displayKey}:</td>
					<td style="color: #333; padding: 4px 8px; font-size: 11px; width: 60%;">${value}</td>
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