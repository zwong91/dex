// Local token icon generator - creates SVG icons dynamically
export const generateTokenIcon = (symbol: string, size: number = 32): string => {
	// Color mapping for different tokens
	const tokenColors: { [key: string]: { bg: string; text: string } } = {
		'BNB': { bg: '#F3BA2F', text: '#000000' },
		'WBNB': { bg: '#F3BA2F', text: '#000000' },
		'ETH': { bg: '#627EEA', text: '#FFFFFF' },
		'WETH': { bg: '#627EEA', text: '#FFFFFF' },
		'USDC': { bg: '#2775CA', text: '#FFFFFF' },
		'USDT': { bg: '#26A17B', text: '#FFFFFF' },
		'BUSD': { bg: '#F0B90B', text: '#000000' },
		'DAI': { bg: '#F5AC37', text: '#000000' },
		'BTC': { bg: '#F7931A', text: '#FFFFFF' },
		'WBTC': { bg: '#F7931A', text: '#FFFFFF' },
		'LINK': { bg: '#375BD2', text: '#FFFFFF' },
		'UNI': { bg: '#FF007A', text: '#FFFFFF' },
		'SUSHI': { bg: '#FA52A0', text: '#FFFFFF' },
		'CAKE': { bg: '#D1884F', text: '#FFFFFF' },
		'ADA': { bg: '#0033AD', text: '#FFFFFF' },
		'DOT': { bg: '#E6007A', text: '#FFFFFF' },
		'MATIC': { bg: '#8247E5', text: '#FFFFFF' },
		'AVAX': { bg: '#E84142', text: '#FFFFFF' },
		'SOL': { bg: '#00FFA3', text: '#000000' },
		'ATOM': { bg: '#2E3148', text: '#FFFFFF' },
	}

	// Get colors for the token or use default
	const colors = tokenColors[symbol.toUpperCase()] || {
		bg: generateColorFromSymbol(symbol),
		text: '#FFFFFF'
	}

	// Get the display text (first 1-3 characters)
	const displayText = getDisplayText(symbol)

	// Create SVG icon
	const svg = `
		<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
			<circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${colors.bg}"/>
			<text
				x="${size/2}"
				y="${size/2 + size/8}"
				text-anchor="middle"
				font-family="Arial, sans-serif"
				font-weight="bold"
				font-size="${size/3}px"
				fill="${colors.text}"
			>
				${displayText}
			</text>
		</svg>
	`.trim()

	// Convert to data URL
	return `data:image/svg+xml;base64,${btoa(svg)}`
}

// Generate a consistent color from symbol using hash
const generateColorFromSymbol = (symbol: string): string => {
	let hash = 0
	for (let i = 0; i < symbol.length; i++) {
		const char = symbol.charCodeAt(i)
		hash = ((hash << 5) - hash) + char
		hash = hash & hash // Convert to 32-bit integer
	}

	// Generate HSL color with good saturation and lightness
	const hue = Math.abs(hash) % 360
	const saturation = 65 + (Math.abs(hash >> 8) % 25) // 65-90%
	const lightness = 45 + (Math.abs(hash >> 16) % 20) // 45-65%

	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Get appropriate display text for token
const getDisplayText = (symbol: string): string => {
	const cleanSymbol = symbol.toUpperCase().replace(/^W/, '') // Remove W prefix for wrapped tokens

	// For very short symbols, use the whole thing
	if (cleanSymbol.length <= 2) {
		return cleanSymbol
	}

	// For 3 characters, use all
	if (cleanSymbol.length === 3) {
		return cleanSymbol
	}

	// For longer symbols, use first 2-3 characters intelligently
	if (cleanSymbol.length === 4) {
		// For 4-char symbols, take first 3
		return cleanSymbol.slice(0, 3)
	}

	// For longer symbols, take first 2
	return cleanSymbol.slice(0, 2)
}

// Generate icon specifically sized for different use cases
export const generateTokenIconSizes = (symbol: string) => ({
	small: generateTokenIcon(symbol, 24),
	medium: generateTokenIcon(symbol, 32),
	large: generateTokenIcon(symbol, 40),
	xlarge: generateTokenIcon(symbol, 48)
})
