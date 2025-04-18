// patterns.js
export function addPatterns(map) {
    const red = new L.StripePattern({ weight:5,spaceWeight:4,color:'red',opacity:1,angle:45 });
    const yellow = new L.StripePattern({ weight:5,spaceWeight:4,color:'yellow',opacity:1,angle:45 });
    red.addTo(map);
    yellow.addTo(map);
    return { red, yellow };
  }