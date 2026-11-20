import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="py-3 px-4 sm:px-6 lg:px-8" data-testid="breadcrumbs">
      <ol className="flex items-center flex-wrap gap-1 text-sm text-gray-500" itemScope itemType="https://schema.org/BreadcrumbList">
        <li className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link to="/" className="hover:text-[#8B4513] transition-colors" itemProp="item">
            <Home className="w-3.5 h-3.5" />
            <meta itemProp="name" content="Home" />
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <ChevronRight className="w-3.5 h-3.5 mx-1 text-gray-400" />
            {index === items.length - 1 ? (
              <span className="text-[#8B4513] font-medium truncate max-w-[180px]" itemProp="name">
                {item.name}
              </span>
            ) : (
              <Link 
                to={item.url} 
                className="hover:text-[#8B4513] transition-colors truncate max-w-[180px]"
                itemProp="item"
              >
                <span itemProp="name">{item.name}</span>
              </Link>
            )}
            <meta itemProp="position" content={String(index + 2)} />
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
