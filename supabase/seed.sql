-- =========================================================
-- Seed data: 1448H Miqaat Calendar & Families
-- =========================================================

-- Families — each gets a unique 6-char access code for "My Jaman" privacy.
insert into public.family (name, access_code) values
  ('Shk Murtaza Bhai Halai',       'XK7M2P'),
  ('M Moayyad Bhai Jamali',        'RT4H9W'),
  ('Muslim Bhai Halai',            'AL3F6Q'),
  ('Dr. Saifuddin Rangwala',       'ZD8N1V'),
  ('Mohammed Bhai Kanchwala',      'BQ5J0L'),
  ('Juzer Bhai Balapurwala',       'GM2T7Y'),
  ('Mustafa Bhai Panki',           'VX9K4R'),
  ('Juzer Bhai Kachwala',          'PH1W6N'),
  ('Yusuf Bhai Mithaiwala',        'LC8F3D'),
  ('Sameer Bhai',                  'TJ0S5A');

-- Shehre Moharramul Haram
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Shehre Moharramul Haram', '2ji tarekh',  '2026-06-16', 'Tuesday',   '2ji tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '3ji tarekh',  '2026-06-17', 'Wednesday', '3ji tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '4thi tarekh', '2026-06-18', 'Thursday',  '4thi tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '5mi tarekh',  '2026-06-19', 'Friday',    '5mi tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '6thi tarekh', '2026-06-20', 'Saturday',  '6thi tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '7mi tarekh',  '2026-06-21', 'Sunday',    '7mi tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '8mi tarekh',  '2026-06-22', 'Monday',    'Aqa Moula TUS Niyaz', null, null),
  ('1448H', 'Shehre Moharramul Haram', '9mi tarekh',  '2026-06-23', 'Tuesday',   '9mi tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '10mi tarekh', '2026-06-24', 'Wednesday', '10mi tarekh', null, null),
  ('1448H', 'Shehre Moharramul Haram', '16mi tarekh', '2026-06-30', 'Tuesday',   '3rd al-Dai al-Mutlaq Syedna Hatim bin Syedna Ibrahim RA', 'Hutaib Mubarak', 'Moayyed Jamali'),
  ('1448H', 'Shehre Moharramul Haram', '23mi tarekh', '2026-07-07', 'Tuesday',   'Syedi Hasanfeer Shaheed AQ', 'Denmal', 'Muslim bhai Halai'),
  ('1448H', 'Shehre Moharramul Haram', '27mi tarekh', '2026-07-11', 'Saturday',  'Syedi Fakhruddin Shaheed AQ', 'Taherabad', 'No Majlis in Manchester');

-- Safarul Muzaffar
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Safarul Muzaffar', '16mi tarekh', '2026-07-30', 'Thursday',  '16mi Darees', null, 'Dr. Saifuddin Rangwala'),
  ('1448H', 'Safarul Muzaffar', '20mi tarekh', '2026-08-03', 'Monday',    'Chehlum Imam Husain SA', 'Karbala', 'Sh. Murtaza bhai Halai'),
  ('1448H', 'Safarul Muzaffar', '28mi tarekh', '2026-08-11', 'Tuesday',   'Shahadat Imam Hasan SA', 'Madina', null);

-- Rabiul Awwal
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Rabiul Awwal', '12mi tarekh', '2026-08-24', 'Monday',   'Eid e Milad un Nabi SAW', 'Madina', null),
  ('1448H', 'Rabiul Awwal', '16mi tarekh', '2026-08-28', 'Friday',   '52nd al-Dai al-Mutlaq Syedna Mohammed Burhanuddin RA', 'Mumbai', null);

-- Rabiul Akhar
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Rabiul Akhar', '4thi tarekh', '2026-09-15', 'Tuesday',   'Milad Imam uz Zaman SA', null, null),
  ('1448H', 'Rabiul Akhar', '16mi tarekh', '2026-09-27', 'Sunday',    '16mi Darees', null, null),
  ('1448H', 'Rabiul Akhar', '20mi tarekh', '2026-10-01', 'Thursday',  'Milad Mubarak, 52nd al-Dai al-Mutlaq Syedna Mohammed Burhanuddin RA', 'Mumbai', null);

-- Jamadal Ula
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Jamadal Ula', '10mi tarekh', '2026-10-20', 'Tuesday',  'Shahadat Maulatena Fatema tuz Zahra AS', 'Madina', null),
  ('1448H', 'Jamadal Ula', '16mi tarekh', '2026-10-26', 'Monday',   '16mi Darees', null, null);

-- Jamadal Ukhra
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Jamadal Ukhra', '16mi tarekh', '2026-11-25', 'Wednesday', '16mi Darees', null, null),
  ('1448H', 'Jamadal Ukhra', '23mi tarekh', '2026-12-02', 'Wednesday', '34th al-Dai al-Mutlaq Syedna Ismail Badruddin bin Maulai Raj RA', 'Jamnagar', null),
  ('1448H', 'Jamadal Ukhra', '27mi tarekh', '2026-12-06', 'Sunday',    '32nd al-Dai al-Mutlaq Syedna Qutub Khan Qutbuddin Shaheed RA', 'Ahmedabad', null);

-- Shehre Rajabul Asab
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Shehre Rajabul Asab', '4thi tarekh', '2026-12-12', 'Saturday',  '37th al-Dai al-Mutlaq Syedna Noor Mohammed Nooruddin RA', 'Mandvi', null),
  ('1448H', 'Shehre Rajabul Asab', '13mi tarekh', '2026-12-21', 'Monday',    'Milad Amirul Mumineen, Maulana Ali Ibne Abitalib SA', null, null),
  ('1448H', 'Shehre Rajabul Asab', '16mi tarekh', '2026-12-24', 'Thursday',  '16mi Darees', null, null),
  ('1448H', 'Shehre Rajabul Asab', '19mi tarekh', '2026-12-27', 'Sunday',    '51st al-Dai al-Mutlaq Syedna Taher Saifuddin RA', 'Mumbai', null),
  ('1448H', 'Shehre Rajabul Asab', '27mi tarekh', '2027-01-04', 'Monday',    'Yaumul Mab''as Shareef', null, null);

-- Shabanul Karim
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Shabanul Karim', '14mi tarekh', '2027-01-21', 'Thursday', 'Lailat un Nisf (Shab e Baraat)', null, null),
  ('1448H', 'Shabanul Karim', '16mi tarekh', '2027-01-23', 'Saturday', '16mi Darees', null, null),
  ('1448H', 'Shabanul Karim', '22mi tarekh', '2027-01-29', 'Friday',   'Maulatena Hurratul Maleka RA', 'Zi Jibla', null);

-- Shehre Ramzanul Moazzam
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Shehre Ramzanul Moazzam', '1li tarekh',  '2027-02-06', 'Saturday',  '1li tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '2ji tarekh',  '2027-02-07', 'Sunday',    '2ji tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '3ji tarekh',  '2027-02-08', 'Monday',    '3ji tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '4thi tarekh', '2027-02-09', 'Tuesday',   '4thi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '5mi tarekh',  '2027-02-10', 'Wednesday', '5mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '6thi tarekh', '2027-02-11', 'Thursday',  '6thi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '7mi tarekh',  '2027-02-12', 'Friday',    '7mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '8mi tarekh',  '2027-02-13', 'Saturday',  '8mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '9mi tarekh',  '2027-02-14', 'Sunday',    '9mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '10mi tarekh', '2027-02-15', 'Monday',    '10mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '11mi tarekh', '2027-02-16', 'Tuesday',   '11mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '12mi tarekh', '2027-02-17', 'Wednesday', '12mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '13mi tarekh', '2027-02-18', 'Thursday',  '13mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '14mi tarekh', '2027-02-19', 'Friday',    '14mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '15mi tarekh', '2027-02-20', 'Saturday',  '15mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '16mi tarekh', '2027-02-21', 'Sunday',    '16mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '17mi tarekh', '2027-02-22', 'Monday',    '17mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '18mi tarekh', '2027-02-23', 'Tuesday',   '18mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '19mi tarekh', '2027-02-24', 'Wednesday', 'Aqa Moula TUS Niyaz', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '20mi tarekh', '2027-02-25', 'Thursday',  '20mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '21mi tarekh', '2027-02-26', 'Friday',    '21mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '22mi tarekh', '2027-02-27', 'Saturday',  'Majmui Niyaz', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '23mi tarekh', '2027-02-28', 'Sunday',    '23mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '24mi tarekh', '2027-03-01', 'Monday',    '24mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '25mi tarekh', '2027-03-02', 'Tuesday',   '25mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '26mi tarekh', '2027-03-03', 'Wednesday', '26mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '27mi tarekh', '2027-03-04', 'Thursday',  '27mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '28mi tarekh', '2027-03-05', 'Friday',    '28mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '29mi tarekh', '2027-03-06', 'Saturday',  '29mi tarekh', null, null),
  ('1448H', 'Shehre Ramzanul Moazzam', '30mi tarekh', '2027-03-07', 'Sunday',    '30mi tarekh', null, null);

-- Shawwalul Mukarram
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Shawwalul Mukarram', '16mi tarekh', '2027-03-23', 'Tuesday',  '16mi Darees', null, null),
  ('1448H', 'Shawwalul Mukarram', '27mi tarekh', '2027-04-03', 'Saturday', 'Syedi Abdul Qadir Hakimuddin AQ', 'Burhanpur', null);

-- Zilqadatil Haram
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Zilqadatil Haram', '12mi tarekh', '2027-04-17', 'Saturday', '35th al-Dai al-Mutlaq Syedna Abduttaiyeb Zakiyuddin bin Syedna Ismail Badruddin RA / 43rd al-Dai al-Mutlaq Syedna Abdeali Saifuddin RA', 'Jamnagar / Surat', null),
  ('1448H', 'Zilqadatil Haram', '16mi tarekh', '2027-04-21', 'Wednesday', '16mi Darees', null, null),
  ('1448H', 'Zilqadatil Haram', '27mi tarekh', '2027-05-02', 'Sunday',    'Milad Mubarak, 51st al-Dai al-Mutlaq Syedna Taher Saifuddin RA', 'Mumbai', null);

-- Zilhijatil Haram
insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes) values
  ('1448H', 'Zilhijatil Haram', '10mi tarekh', '2027-05-15', 'Saturday', 'Eid ul Adha', null, null),
  ('1448H', 'Zilhijatil Haram', '16mi tarekh', '2027-05-22', 'Saturday', '16mi Darees', null, null),
  ('1448H', 'Zilhijatil Haram', '18mi tarekh', '2027-05-23', 'Sunday',   'Eid e Ghadeer e Khum', null, null);
