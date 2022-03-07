import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View, useWindowDimensions } from 'react-native';

import type { BaseHeaderProps } from '../../index';
import createStyleSheet from '../../styles/createStyleSheet';
import getDefaultHeaderHeight from '../../styles/getDefaultHeaderHeight';
import useHeaderStyle from '../../styles/useHeaderStyle';
import useUIKitTheme from '../../theme/useUIKitTheme';
import Text from '../Text';

type HeaderElement = string | React.ReactElement | null;
type HeaderProps = BaseHeaderProps<{
  title?: HeaderElement;
  left?: HeaderElement;
  right?: HeaderElement;
  onPressLeft?: () => void;
  onPressRight?: () => void;
}>;

const AlignMapper = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;
const Header: React.FC<HeaderProps> & { Button: typeof HeaderButton } = ({
  children,
  titleAlign = 'left',
  title = null,
  left = null,
  right = null,
  onPressLeft,
  onPressRight,
}) => {
  const { topInset } = useHeaderStyle();
  const { width, height } = useWindowDimensions();
  const { colors } = useUIKitTheme();

  if (!title && !left && !right) {
    return (
      <View style={{ paddingTop: topInset, backgroundColor: colors.ui.header.nav.none.background }}>{children}</View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topInset,
          backgroundColor: colors.ui.header.nav.none.background,
          borderBottomColor: colors.ui.header.nav.none.borderBottom,
        },
      ]}
    >
      <View style={[styles.header, { height: getDefaultHeaderHeight(width > height) }]}>
        {left && (
          <View style={styles.left}>
            <HeaderButton onPress={onPressLeft}>{left}</HeaderButton>
          </View>
        )}
        <View style={[styles.title, { alignItems: AlignMapper[titleAlign] }]}>
          {typeof title === 'string' ? <Text h1>{title}</Text> : title}
        </View>
        {right && (
          <View style={styles.right}>
            <HeaderButton onPress={onPressRight}>{right}</HeaderButton>
          </View>
        )}
      </View>
      {children}
    </View>
  );
};

const HeaderButton: React.FC<TouchableOpacityProps & { color?: string }> = ({
  children,
  disabled,
  onPress,
  color,
  ...props
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      {...props}
      disabled={!onPress || disabled}
      onPress={(e) => onPress?.(e)}
      activeOpacity={0.7}
    >
      {(typeof children).match(/string|number/) ? (
        <Text button color={color}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = createStyleSheet({
  container: {
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  left: {
    height: '100%',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  right: {
    height: '100%',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  button: {
    padding: 4,
  },
});

Header.Button = HeaderButton;
export default Header;