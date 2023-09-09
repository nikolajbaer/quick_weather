import requests
import pygrib
import datetime
import tempfile
import sys
import os

region_stations = {
    "ar":["aer","afg","ajk","alu"],
    "er":["akq","box","car","chs","gyx","ilm","lwx","mhx","okx","phi"],
    "ofs":["estofs","rtofs"],
    "pr":["hfo"],
    "sr":['bro', 'crp', 'hgx', 'jax', 'key', 'lch', 'lix', 'mfl', 'mlb', 'mob', 'sju', 'tae', 'tbw'],
    "wr":['eka', 'lox', 'mfr', 'mtr', 'pqr', 'sew', 'sgx'],
}

def getData(cg="0",station="sgx",region="wr",hour="00"):
    print("downloading grib")
    params = { 
        "station":station,
        "region":region,
        "hour":hour,
        "hour_minute":"%s00"%hour,
        "cg":"CG%s"%cg,
        "date":datetime.datetime.now().strftime("%Y%m%d"),
        "trkng":(cg == "0" and "_Trkng" or ""),
    }
    url = "https://nomads.ncep.noaa.gov/pub/data/nccf/com/nwps/prod/%(region)s.%(date)s/%(station)s/%(hour)s/%(cg)s/%(station)s_nwps_%(cg)s%(trkng)s_%(date)s_%(hour_minute)s.grib2" % params
    print(url)
    resp = requests.get(url) 
    print(resp.status_code)
    f = tempfile.NamedTemporaryFile('wb',delete=False)
    f.write(resp.content)
    f.close() 
    print("Wrote to ",f.name)
    grbs = pygrib.open(f.name)
    names = set()
    result = []
    for grb in grbs:
        names.add(grb.name)
        result.append(grb)
    print("Found",names)
    os.unlink(f.name)
    return result 

if __name__=="__main__":
    region = "wr"
    station = "sgx"
    data = []
    for cg in "1":#"123":
        grbs = getData(cg=cg,station=station,region=region,hour="00")
        data.extend(grbs) 
    import code
    code.interact(local=locals())