import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '~/components/ui/text';

interface CollapsibleTextProps {
  text: string;
  numberOfLines?: number;
}

/** Text clamped to `numberOfLines` with a "Read more" / "Show less" toggle. */
export function CollapsibleText({ text, numberOfLines = 6 }: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [measured, setMeasured] = useState(false);

  return (
    <View>
      {/* Invisible copy without clamping, used to measure the full line count. */}
      {!measured && (
        <Text
          className="absolute text-base leading-6 opacity-0"
          onTextLayout={(e) => {
            setShowToggle(e.nativeEvent.lines.length > numberOfLines);
            setMeasured(true);
          }}>
          {text}
        </Text>
      )}
      <Text
        className="text-base leading-6 text-foreground"
        numberOfLines={expanded ? undefined : numberOfLines}>
        {text}
      </Text>
      {showToggle && (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          <Text className="mt-1 text-sm font-medium text-primary">
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
