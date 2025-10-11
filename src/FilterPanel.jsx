import './FilterPanel.css';
import { useState, useEffect } from 'react';

export default function FilterSidebar({ 
  filters, 
  onFilterChange, 
  onDateRangeChange,
  onTagChange,
  onClearFilters, 
  uniqueValues,
  showFilters,
  onClose
}) {
  if (!showFilters) return null;

  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [exactPrice, setExactPrice] = useState('');

  // Initialize price range from filters
  useEffect(() => {
    const minPrice = filters.minPrice ? parseInt(filters.minPrice) : 0;
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice) : 1000;
    setPriceRange([minPrice, maxPrice]);
  }, [filters.minPrice, filters.maxPrice]);

  const handleFilterChange = (filterName, value) => {
    onFilterChange(filterName, value);
  };

  const handlePriceRangeChange = (index, value) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(value) || 0;
    
    // Ensure min doesn't exceed max and vice versa
    if (index === 0 && newRange[0] > newRange[1]) {
      newRange[1] = newRange[0];
    }
    if (index === 1 && newRange[1] < newRange[0]) {
      newRange[0] = newRange[1];
    }
    
    setPriceRange(newRange);
    onFilterChange('minPrice', newRange[0]);
    onFilterChange('maxPrice', newRange[1]);
  };

  const handleExactPriceSearch = () => {
    if (exactPrice) {
      const price = parseInt(exactPrice);
      if (!isNaN(price)) {
        onFilterChange('minPrice', price);
        onFilterChange('maxPrice', price);
        setPriceRange([price, price]);
      }
    }
  };

  const handleExactPriceClear = () => {
    setExactPrice('');
    onFilterChange('minPrice', '');
    onFilterChange('maxPrice', '');
    setPriceRange([0, 1000]);
  };

  const handleTagToggle = (tag) => {
    const isChecked = filters.tags.includes(tag);
    onTagChange(tag, !isChecked);
  };

  const getSliderBackground = () => {
    const min = 0;
    const max = 1000;
    const percentage1 = ((priceRange[0] - min) / (max - min)) * 100;
    const percentage2 = ((priceRange[1] - min) / (max - min)) * 100;
    return `linear-gradient(to right, #ddd ${percentage1}%, #ff6b6b ${percentage1}%, #ff6b6b ${percentage2}%, #ddd ${percentage2}%)`;
  };

  // Check if any sorting is actively selected (not default)
  const isSortingActive = filters.sortBy && filters.sortBy !== "newest";

  // Define sort options visually
  const sortOptions = [
    { value: "newest", label: "🆕 Newest to Oldest (Default)" },
    { value: "oldest", label: "🕰️ Oldest to Newest" },
    { value: "price-low-high", label: "💰 Price: Low to High" },
    { value: "price-high-low", label: "💰 Price: High to Low" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div className="sidebar-overlay" onClick={onClose}></div>
      
      {/* Sidebar */}
      <div className="filter-sidebar">
        <div className="sidebar-header">
          <h2>⚡ FILTER WEAPONS </h2>
          <button className="sidebar-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sidebar-content">
          {/* Sort Section */}
          <div className="filter-section">
            <h3 className="section-title">📊 SORT BY</h3>
            <div className="sort-pills-container">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`sort-pill ${
                    filters.sortBy === option.value ||
                    (!filters.sortBy && option.value === "newest")
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleFilterChange('sortBy', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range with Dual Slider */}
          <div className="filter-section">
            <h3 className="section-title">💰 PRICE RANGE</h3>
            
            {/* Dual Range Slider */}
            <div className="price-slider-container">
              <div className="slider-wrapper">
                <div 
                  className="slider-track"
                  style={{ background: getSliderBackground() }}
                >
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[0]}
                    onChange={(e) => handlePriceRangeChange(0, e.target.value)}
                    className="slider slider-left"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => handlePriceRangeChange(1, e.target.value)}
                    className="slider slider-right"
                  />
                </div>
              </div>
              
              <div className="slider-values">
                <span className="slider-value">£{priceRange[0]}</span>
                <span className="slider-separator">-</span>
                <span className="slider-value">£{priceRange[1]}</span>
              </div>
            </div>

            {/* Exact Price Search */}
            <div className="exact-price-section">
              <h4 className="exact-price-title">🎯 SEARCH EXACT PRICE</h4>
              <div className="exact-price-inputs">
                <input
                  type="number"
                  placeholder="Enter exact price..."
                  value={exactPrice}
                  onChange={(e) => setExactPrice(e.target.value)}
                  className="exact-price-input"
                />
                <button 
                  onClick={handleExactPriceSearch}
                  className="exact-price-button"
                >
                  🔍
                </button>
                <button 
                  onClick={handleExactPriceClear}
                  className="exact-price-clear"
                >
                  ❌
                </button>
              </div>
            </div>
          </div>

          {/* Type Filter */}
          <div className="filter-section">
            <h3 className="section-title">🎭 TYPE</h3>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              {uniqueValues.type.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Series Filter */}
          <div className="filter-section">
            <h3 className="section-title">📺 SERIES</h3>
            <select
              value={filters.series}
              onChange={(e) => handleFilterChange('series', e.target.value)}
              className="filter-select"
            >
              <option value="">All Series</option>
              {uniqueValues.series.map(series => (
                <option key={series} value={series}>{series}</option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="filter-section">
            <h3 className="section-title">🏷️ BRAND</h3>
            <select
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className="filter-select"
            >
              <option value="">All Brands</option>
              {uniqueValues.brand.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div className="filter-section">
            <h3 className="section-title">⭐ CONDITION</h3>
            <select
              value={filters.condition}
              onChange={(e) => handleFilterChange('condition', e.target.value)}
              className="filter-select"
            >
              <option value="">All Conditions</option>
              {uniqueValues.condition.map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>

          {/* Color Variant Filter */}
          <div className="filter-section">
            <h3 className="section-title">🎨 COLOR</h3>
            <select
              value={filters.colorVariant}
              onChange={(e) => handleFilterChange('colorVariant', e.target.value)}
              className="filter-select"
            >
              <option value="">All Colors</option>
              {uniqueValues.colorVariant.map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>

          {/* Purchase Location Filter */}
          <div className="filter-section">
            <h3 className="section-title">🏪 STORE</h3>
            <select
              value={filters.purchaseLocation}
              onChange={(e) => handleFilterChange('purchaseLocation', e.target.value)}
              className="filter-select"
            >
              <option value="">All Locations</option>
              {uniqueValues.purchaseLocation.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Date Filters */}
          <div className="filter-section">
            <h3 className="section-title">📅 DATE FILTERS</h3>
            
            {/* Date Range */}
            <div className="date-input-group">
              <label>Date Range:</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={filters.dateRange.startDate}
                  onChange={(e) => onDateRangeChange('startDate', e.target.value)}
                  className="date-input"
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  value={filters.dateRange.endDate}
                  onChange={(e) => onDateRangeChange('endDate', e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            {/* Specific Date */}
            <div className="date-input-group">
              <label>Specific Date:</label>
              <input
                type="date"
                value={filters.specificDate}
                onChange={(e) => handleFilterChange('specificDate', e.target.value)}
                className="date-input full-width"
              />
            </div>

            {/* Month and Year */}
            <div className="month-year-group">
              <div className="month-year-input">
                <label>Month:</label>
                <select
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Months</option>
                  {uniqueValues.months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="month-year-input">
                <label>Year:</label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Years</option>
                  {uniqueValues.years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tags Filter */}
          {uniqueValues.tags.length > 0 && (
            <div className="filter-section">
              <h3 className="section-title">🏷️ TAGS</h3>
              <div className="tags-container">
                {uniqueValues.tags.map(tag => (
                  <label key={tag} className="tag-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                      className="tag-checkbox-input"
                    />
                    <span className="tag-checkbox-custom"></span>
                    #{tag}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        <div className="sidebar-footer">
          <button className="clear-filters-button" onClick={onClearFilters}>
            🗑️ CLEAR ALL FILTERS
          </button>
        </div>
      </div>
    </>
  );
}
