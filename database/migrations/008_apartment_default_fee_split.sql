-- Default fee split for apartments that only have a single apartment_fee (= monthly_fee).
-- Ratio: байр 60%, зогсоол 20%, ус 10%, цахилгаан 10%

UPDATE apartments
   SET apartment_fee = ROUND(monthly_fee * 0.60, 2),
       parking_fee   = ROUND(monthly_fee * 0.20, 2),
       water_fee     = ROUND(monthly_fee * 0.10, 2),
       electricity_fee = monthly_fee
                         - ROUND(monthly_fee * 0.60, 2)
                         - ROUND(monthly_fee * 0.20, 2)
                         - ROUND(monthly_fee * 0.10, 2)
 WHERE monthly_fee > 0
   AND parking_fee = 0
   AND water_fee = 0
   AND electricity_fee = 0
   AND apartment_fee >= monthly_fee;
