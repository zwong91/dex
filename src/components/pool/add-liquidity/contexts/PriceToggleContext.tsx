import React, { createContext, useContext, useState } from 'react'

interface PriceToggleContextType {
	isReversed: boolean
	togglePriceDirection: () => void
}

const PriceToggleContext = createContext<PriceToggleContextType | undefined>(undefined)

export const usePriceToggle = () => {
	const context = useContext(PriceToggleContext)
	if (context === undefined) {
		throw new Error('usePriceToggle must be used within a PriceToggleProvider')
	}
	return context
}

interface PriceToggleProviderProps {
	children: React.ReactNode
}

export const PriceToggleProvider: React.FC<PriceToggleProviderProps> = ({ children }) => {
	const [isReversed, setIsReversed] = useState(false)

	const togglePriceDirection = () => {
		setIsReversed(prev => !prev)
	}

	return (
		<PriceToggleContext.Provider value={{ isReversed, togglePriceDirection }}>
			{children}
		</PriceToggleContext.Provider>
	)
}
