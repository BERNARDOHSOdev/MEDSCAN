import React, { useId } from "react";
import Svg, { Defs, LinearGradient, Stop, Path, Rect, G } from "react-native-svg";

export default function AnalysisHeroArtwork({ dark }) {
  const id = `heroDocument${useId().replace(/:/g, "")}`;
  return <Svg accessible={false} width={270} height={240} viewBox="0 0 270 240">
    <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={dark ? "#347658" : "#B6E9DB"}/><Stop offset="1" stopColor={dark ? "#0C4731" : "#66B5A3"}/></LinearGradient><LinearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={dark ? "#65B58C" : "#E2F8F0"}/><Stop offset="1" stopColor="#15967C" stopOpacity=".3"/></LinearGradient></Defs>
    <G transform="rotate(-9 140 120)"><Path d="M38 38 Q38 17 59 17 H174 L228 70 V226 Q228 243 211 243 H58 Q38 243 38 223 Z" fill={`url(#${id})`} stroke={`url(#${id}edge)`} strokeWidth="4"/><Path d="M174 17 V52 Q174 70 192 70 H228" fill={dark ? "#479D73" : "#8ACEBA"} stroke={`url(#${id}edge)`} strokeWidth="3"/><Rect x="72" y="99" width="86" height="10" rx="5" fill={dark ? "#489B75" : "#15967C"}/><Rect x="72" y="130" width="125" height="10" rx="5" fill={dark ? "#398C68" : "#43B599"}/><Rect x="72" y="161" width="82" height="10" rx="5" fill={dark ? "#398C68" : "#43B599"}/><Rect x="165" y="161" width="32" height="10" rx="5" fill={dark ? "#398C68" : "#43B599"}/></G>
  </Svg>;
}
