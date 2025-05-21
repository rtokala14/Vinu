import React from "react";

const LibraryItemSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
      <div className="w-full h-48 bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
      <div className="p-4">
        <div className="w-3/4 h-6 bg-gray-300 dark:bg-gray-700 animate-pulse mb-2"></div>
        <div className="w-1/2 h-4 bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
      </div>
    </div>
  );
};

export default LibraryItemSkeleton;
