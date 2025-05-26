import type { FC } from 'react';
import { View } from 'react-native';

import { Input } from '~/components/ui/input';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const SearchInput: FC<SearchInputProps> = ({ value, onChangeText }) => {
  return (
    <View className="p-4 pt-2">
      <Input
        placeholder="Search..."
        selectTextOnFocus
        returnKeyType="search"
        value={value}
        onChangeText={onChangeText}
        style={{
          height: 50,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#ccc',
          paddingHorizontal: 16,
        }}
      />
    </View>
  );
};
