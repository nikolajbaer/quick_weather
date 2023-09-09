FROM python
RUN mkdir /code
WORKDIR /code
COPY grib_db/requirements.txt /code/
RUN pip install -r requirements.txt
COPY ./grib_db/* /code/


