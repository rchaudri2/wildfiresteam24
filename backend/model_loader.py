
import os, requests

def download_from_drive(file_id, dest):
    URL="https://drive.google.com/uc?export=download"
    session=requests.Session()
    r=session.get(URL, params={'id': file_id}, stream=True)
    for k,v in r.cookies.items():
        if k.startswith('download_warning'):
            r=session.get(URL, params={'id': file_id, 'confirm': v}, stream=True)
    with open(dest,'wb') as f:
        for chunk in r.iter_content(32768):
            if chunk:
                f.write(chunk)

def ensure_models():
    os.makedirs('models', exist_ok=True)
    files={
        'models/CAUSE_MODEL.pkl': '1O1VeTHsF4q_ypRrWObFF1XwzAaeA9p-Z',
        'models/SIZE_MODEL.pkl': '1WZ2Y_Rq3q7SAhyJ-BNImMDvGf5l0PlT3'
    }
    for path,fid in files.items():
        if not os.path.exists(path):
            print(f'Downloading {path}')
            download_from_drive(fid, path)
        else:
            print(f'{path} exists')
