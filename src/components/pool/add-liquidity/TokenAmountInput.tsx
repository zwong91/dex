import { Avatar, Box, Button, Card, TextField, Typography } from '@mui/material'

interface TokenAmountInputProps {
	token: {
		symbol: string
		icon: string
	}
	amount: string
	onAmountChange: (value: string) => void
	balance: string
	onPercentageClick: (percentage: number) => void
}

const TokenAmountInput = ({
	token,
	amount,
	onAmountChange,
	balance,
	onPercentageClick,
}: TokenAmountInputProps) => {
	return (
		<Card
			sx={{
				p: 5,
				backgroundColor: '#2A2D3E',
				border: 1,
				borderColor: 'rgba(255, 255, 255, 0.1)',
				borderRadius: 3,
				minHeight: '140px',
			}}
		>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
					<Avatar
						sx={{ width: 32, height: 32 }}
						src={token.icon}
						alt={token.symbol}
					>
						{(token?.symbol || '').charAt(0)}
					</Avatar>
					<Typography variant="h6" fontWeight={600} color="white">
						{token.symbol}
					</Typography>
				</Box>
				<Box sx={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-end' }}>
					<TextField
						placeholder="0"
						value={amount}
						onChange={e => onAmountChange(e.target.value)}
						type="number"
						variant="standard"
						inputProps={{
							min: "0",
							step: "any"
						}}
						InputProps={{
							disableUnderline: true,
							sx: {
								fontSize: '2rem',
								fontWeight: 600,
								color: 'white',
								textAlign: 'right',
								minWidth: '80px',
								maxWidth: '200px',
								width: `${Math.max(80, (amount?.length || 1) * 20 + 40)}px`,
								'& input': {
									textAlign: 'right',
									color: 'white',
									fontSize: '2rem',
									fontWeight: 600,
									padding: 0,
									width: '100%',
								},
							},
						}}
						sx={{
							'& .MuiInput-root': {
								'&:before': { borderBottom: 'none' },
								'&:after': { borderBottom: 'none' },
								'&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
							},
						}}
					/>
				</Box>
			</Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
					Balance: {parseFloat(balance || '0').toFixed(6)}
				</Typography>
				<Box sx={{ display: 'flex', gap: 1 }}>
					<Button
						size="small"
						variant="outlined"
						onClick={() => onPercentageClick(0.5)}
						sx={{
							minWidth: '55px',
							height: '32px',
							fontSize: '0.75rem',
							borderColor: 'rgba(255, 255, 255, 0.2)',
							color: 'rgba(255, 255, 255, 0.7)',
							borderRadius: '6px',
							'&:hover': {
								borderColor: 'rgba(255, 255, 255, 0.3)',
								backgroundColor: 'rgba(255, 255, 255, 0.05)',
							},
						}}
					>
						50%
					</Button>
					<Button
						size="small"
						variant="outlined"
						onClick={() => onPercentageClick(1.0)}
						sx={{
							minWidth: '55px',
							height: '32px',
							fontSize: '0.75rem',
							borderColor: 'rgba(255, 255, 255, 0.2)',
							color: 'rgba(255, 255, 255, 0.7)',
							borderRadius: '6px',
							'&:hover': {
								borderColor: 'rgba(255, 255, 255, 0.3)',
								backgroundColor: 'rgba(255, 255, 255, 0.05)',
							},
						}}
					>
						MAX
					</Button>
				</Box>
			</Box>
		</Card>
	)
}

export default TokenAmountInput
