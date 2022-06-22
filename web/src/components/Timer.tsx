import React, { useEffect, useState } from "react";


function secondsToTime(remainingSeconds: number) {
    let hours = Math.floor(remainingSeconds / (60 * 60));

    let divisor_for_minutes = remainingSeconds % (60 * 60);
    let minutes = Math.floor(divisor_for_minutes / 60);

    let divisor_for_seconds = divisor_for_minutes % 60;
    let seconds = Math.ceil(divisor_for_seconds);

    let obj = {
      "h": hours,
      "m": minutes,
      "s": seconds
    };
    return obj;
  }

export function Timer({durationMs, startTimestamp}: {durationMs: number, startTimestamp: number}) {
    const [timeLeftMs, setTimeLeft] = useState(startTimestamp + durationMs - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            const secondsRemaining = startTimestamp + durationMs - Date.now();
            setTimeLeft(secondsRemaining);
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }, [durationMs, startTimestamp, setTimeLeft]);

    const time = secondsToTime(timeLeftMs / 1000);

    return <div>{timeLeftMs < 0 ? 'Times Up!' : `${time.m}:${time.s < 10 ? "0" : ""}${time.s}`}</div>;
}