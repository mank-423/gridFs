import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FileViewer = () => {
  const [filesId, setFilesId] = useState([]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/info/files');
      const filteredId = response.data.map((item)=>item._id);
      setFilesId(filteredId)
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    

    fetchFiles();
  }, []);

  return (
    <div>
      <h1>File Viewer</h1>
      <div>
        {filesId.map((fileId) => (
          <iframe
            key={fileId}
            title={`File ${fileId}`}
            src={`http://localhost:5000/file/${fileId}`}
            width="600"
            height="400"
          />
        ))}
      </div>
    </div>
  );
};

export default FileViewer;
