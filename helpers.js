function toYMDFormat(date) {
  let month = date.getMonth() + 1 + "";
  if (!month[1]) month = "0" + month;
  let day = date.getDay() + 1 + "";
  if (!day[1]) day = "0" + day;
  return date.getFullYear() + "-" + month + "-" + day;
};

function toDate(ymd) {
  let date;
  if (ymd.match(/^[0-9]{4}\-[0-9]{1,2}\-[0-9]{1,2}$/)) {
    date = new Date(ymd);
  }
  return date;
};

exports.toYMDFormat = toYMDFormat;
exports.toDate = toDate;