import {Touchable} from '@shopify/shop-minis-react'

interface ThemeToggleProps {
  isDarkMode: boolean
  onToggle: () => void
  className?: string
}

export function ThemeToggle({isDarkMode, onToggle, className = ''}: ThemeToggleProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Theme Toggle */}
      <Touchable onClick={onToggle}>
        <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-1 ${
          isDarkMode 
            ? 'bg-gray-700 justify-end' 
            : 'bg-gray-300 justify-start'
        }`}>
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            isDarkMode ? 'bg-white' : 'bg-white'
          }`}></div>
        </div>
      </Touchable>
      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {isDarkMode ? '🌙' : '☀️'}
      </span>
    </div>
  )
}
