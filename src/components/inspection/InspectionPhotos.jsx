import React from 'react';

export const InspectionPhotos = ({ photoFiles, existingPhotos, onAddPhotos, onRemoveNewPhoto }) => {
    return (
        <section className="form-section">
            <h3>Inspection Photos</h3>
            <div className="photo-upload">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onAddPhotos}
                    id="inspection-photos"
                />
                <label htmlFor="inspection-photos" className="upload-button">
                    📷 Add Photos
                </label>
            </div>

            {photoFiles.length > 0 && (
                <div className="photo-previews">
                    {photoFiles.map((file, index) => (
                        <div key={index} className="photo-preview">
                            <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} />
                            <button
                                type="button"
                                onClick={() => onRemoveNewPhoto(index)}
                                className="remove-photo"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {existingPhotos && existingPhotos.length > 0 && (
                <div className="existing-photos">
                    <h4>Existing Photos</h4>
                    <div className="photo-previews">
                        {existingPhotos.map((url, index) => (
                            <div key={index} className="photo-preview">
                                <img src={url} alt={`Inspection ${index + 1}`} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};
