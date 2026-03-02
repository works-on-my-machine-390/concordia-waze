const React = require('react');
const { View } = require('react-native');

module.exports = {
  __esModule: true,
  default: ({ children }) => React.createElement(View, {}, children),
  Svg: ({ children }) => React.createElement(View, {}, children),
  SvgXml: 'SvgXml',
  Polygon: 'Polygon',
};