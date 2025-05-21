import React from "react";

const SeriesItemSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
      <div className="relative">
        {/* Placeholder for stacked images */}
        <div className="w-full h-48 bg-gray-300 dark:bg-gray-700 animate-pulse rounded-t-lg"></div>
        {/* Placeholder for badge */}
        <div className="absolute top-2 right-2 w-12 h-6 bg-gray-400 dark:bg-gray-600 animate-pulse rounded"></div>
      </div>
      <div className="p-4">
        <div className="w-3/4 h-6 bg-gray-300 dark:bg-gray-700 animate-pulse mb-2"></div>
        <div className="w-1/2 h-4 bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
      </div>
    </div>
  );
};

export default SeriesItemSkeleton;
