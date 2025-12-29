import { useState, useEffect } from 'react';

const CurrencyInput = ({ value, onChange, placeholder = "0", className = "", disabled = false, required = false }) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      // Format number with dots for thousands separator
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      setDisplayValue(formatNumber(numValue));
    }
  }, [value]);

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleChange = (e) => {
    const input = e.target.value;

    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, '');

    if (cleaned === '') {
      setDisplayValue('');
      onChange('');
      return;
    }

    // Parse to number and format
    const numValue = parseInt(cleaned, 10);
    setDisplayValue(formatNumber(numValue));
    onChange(numValue.toString());
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
        Rp
      </span>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        className={`w-full px-4 py-2.5 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </div>
  );
};

// Disable prop-types warning for this component
CurrencyInput.propTypes = {};

export default CurrencyInput;
