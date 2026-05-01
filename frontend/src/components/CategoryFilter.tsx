import React from "react";
import "./CategoryFilter.css";

const CATEGORIES = ["All", "Cricket", "Crypto", "News", "Sports", "Politics"];

interface CategoryFilterProps {
  selected: string;
  onChange: (cat: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange }) => {
  return (
    <nav className="category-filter" aria-label="Category filter">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={`category-filter__btn${selected === cat ? " category-filter__btn--active" : ""}`}
          onClick={() => onChange(cat)}
          aria-pressed={selected === cat}
        >
          {cat}
        </button>
      ))}
    </nav>
  );
};

export default CategoryFilter;
