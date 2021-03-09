import json
import h5py
import numpy as np
import pandas as pd
from pathlib import Path
import argparse
from flask import Flask, jsonify, Response
from flask_cors import CORS
import math

class NumpyEncoder(json.JSONEncoder):
    """ Special json encoder for numpy types """
    # pylint: disable=method-hidden
    def default(self, obj):
        if isinstance(obj, float) and np.isnan(obj):
            return 1000000000
        elif isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
            np.int16, np.int32, np.int64, np.uint8,
            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, ( np.float_, np.float16, np.float32, 
            np.float64)):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj,(np.ndarray,)):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)


class Server:
    def __init__(self, dataFolder="./data", port=None, debug=False):
        self.port = port
        self.debug = debug
        self.__data = {} #locale 
        self.info_data = {            }
        # create index

        for fold in Path(dataFolder).glob("*"):
            if not fold.is_dir(): continue
            __D__ = fold.stem
            csv = str(list(fold.glob("*.csv"))[0].resolve())
            df = pd.read_csv(csv)
            self.__data[__D__] = {
                "datasetName": __D__,
                "csv": csv,
                "n": df.shape[0],
                "d": df.shape[1],
                "technique": {} 
            }
            '''self.info_data = {
                "n": df.shape[0],
                "d": df.shape[1],
            }'''
            for tech_fold in fold.glob("*"):
                if not tech_fold.is_dir(): continue
                __T__ = tech_fold.stem
                if __T__ not in self.__data[__D__]["technique"]: self.__data[__D__]["technique"][__T__] = {}
                for k_fold in tech_fold.glob("*"):
                    if not k_fold.is_dir(): continue
                    __K__ = k_fold.stem #int(k_fold.stem.replace("k", ""))
                    if __K__ not in self.__data[__D__]["technique"][__T__]: self.__data[__D__]["technique"][__T__][__K__] = {}
                    for runs_fold in k_fold.glob("*"):
                        if not runs_fold.is_dir(): continue
                        __R__ = runs_fold.stem #int(runs_fold.stem.replace("r", ""))
                        if __R__ not in self.__data[__D__]["technique"][__T__][__K__]: 
                            self.__data[__D__]["technique"][__T__][__K__][__R__] = {
                                "file": str(list(runs_fold.glob("*.hdf5"))[0].resolve()),
                                "iterations": len(h5py.File(list(runs_fold.glob("*.hdf5"))[0])["iteration"])
                            }
            
            self.index_data = list(self.__data.values())
    
    def start(self):
        # start flask
        self.__startFlask(port=self.port, debug=self.debug)
    
    def __startFlask(self, port=None, debug=False):
        app = Flask("Progressive Ensemble Clustering Server")
        CORS(app)
        app.json_encoder = NumpyEncoder
        ###########
        @app.route("/", methods=["GET"])
        def __index():
            return jsonify(self.index_data)
        ###########
        @app.route("/<datasetName>", methods=["GET"])
        def __dataset(datasetName):
            f = Path(self.__data[datasetName]["csv"])
            csv = list(open(f).readlines())
            return Response(csv)
        ###########
        @app.route("/<datasetName>/entries", methods=["GET"])
        def __datasetinformation(datasetName):
            return jsonify(self.__data[datasetName]["n"])
        ###########
        @app.route("/<datasetName>/<technique>/<k>/<r>/<iteration>", methods=["GET"])
        def __iteration(datasetName, technique, k, r, iteration):
            __T__ = technique
            __K__ = k if str(k).startswith("k") else f"k{k}"
            __R__ = r if str(r).startswith("r") else f"r{r}"
            __I__ = int(str(iteration).replace("it", ""))

            data = self.__data[datasetName]["technique"][__T__][__K__][__R__]
            f = h5py.File(Path(data["file"]))

            result = {}
            for key in f:
                val = f[key][__I__]
                try:
                    result[key] = val.decode()
                except (UnicodeDecodeError, AttributeError):
                    if not isinstance(val, np.ndarray) and val == np.inf:
                        result[key] = None
                    else: result[key] = val
                    

            #result = json.loads(json.dumps(result, cls=NumpyEncoder))
            return jsonify(result)


        app.run(host="0.0.0.0", port=port, debug=debug)
    



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("port", help="listening port")
    parser.add_argument("-input", "--input", default="./data", help="input data folder")
    parser.add_argument("-debug", "--debug", action="store_true", help="activate debug")
    args = parser.parse_args()

    server = Server(dataFolder=args.input, port=args.port, debug=args.debug)
    server.start()