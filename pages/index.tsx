import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography,
    CircularProgress, Switch
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import ShieldIcon from '@mui/icons-material/Shield';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import Papa from 'papaparse';

export default function HomePage() {
    type Metadata = {
        [key: string]: {
            identifierType?: string;
            dataType?: string;
        };
    };

    // State for filter selections
    const [prevAttribute, setPrevAttribute] = useState('');
    const [attribute, setAttribute] = useState('');
    const [identifierType, setIdentifierType] = useState('');
    const [dataType, setDataType] = useState('');

    // State of each attribute's configuration data
    interface AttributeConfig {
        identifierType?: string;
        dataType?: string;
    }

    const [attributeInfo, setAttributeInfo] = useState<Record<string, AttributeConfig>>({});

    // Placeholder for table data
    const [data, setData] = useState([]);
    // const [data, setData] = useState<any[]>([]);

    const [anonymizedData, setAnonymizedData] = useState<any[] | null>(null);
    const [showAnonymized, setShowAnonymized] = useState(false);
    const [pendingAnonymize, setPendingAnonymize] = useState(false);

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const [anonymizationDialogOpen, setAnonymizationDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const openAnonymizationDialog = async (payload: {
            [x: string]: any; dataset?: null; metadata?: {
                Name: string; IDType: string; DateType: string; PK: boolean; // puoi cambiare se prevedi di supportare PK
            }[];
        }) => {
        setAnonymizationDialogOpen(true);
        setLoading(true);

        try {
            const res = await fetch('https://kgen-api-88292e39742b.herokuapp.com/api/anonymize', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            console.log(result["dataset"])
            const parsedData = parseDatasetJson(result["dataset"]);
            const mergedData = mergeSensitiveDataBack(data, parsedData, payload["metadata"]);
            setAnonymizedData(mergedData);
            console.log(mergedData)
        } catch (err) {
            console.error('Anonymization failed:', err);
        } finally {
            setShowAnonymized(true); // Automatically switch to anonymized view
            setLoading(false);
        }
    };

    const parseDatasetJson = (rawJson: string) => {
        try {
            const parsedArray = JSON.parse(rawJson); // trasforma la stringa in array di array
            const headers = parsedArray[0]; // prima riga sono le intestazioni
            const data = parsedArray.slice(1).map((row: { [x: string]: any; }) => {
                const obj: { [key: string]: any } = {};
                headers.forEach((key: string | number, index: string | number) => {
                    obj[key] = row[index];
                });
                return obj;
            });
            return data; // [{ Name: "*****", ... }, ...]
        } catch (e) {
            console.error('Errore nel parsing del dataset JSON:', e);
            return [];
        }
    };

    const downloadAnonymizedCSV = () => {
        if (!anonymizedData?.length) {
            alert("No anonymized data to download.");
            return;
        }

        const headers = Object.keys(anonymizedData[0]);
        const csvRows = [
            headers.join(','), // header row
            ...anonymizedData.map(row =>
                headers.map(header => JSON.stringify(row[header] ?? '')).join(',')
            )
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'anonymized_dataset.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Funzione per verificare se tutti gli attributi sono configurati
    const areAllAttributesConfigured = () => {
        return Object.values(attributeInfo).every((info: AttributeConfig) => {
            if (info.identifierType === "quasi-identifier") {
                // Se l'identifierType è "quasi-identifier", deve esserci anche un dataType
                return info.identifierType && info.dataType;
            }
            // Altrimenti basta che l'identifierType sia configurato
            return info.identifierType;
        });
    };

    const initMetadata = (data: any[]) => {
        if (!data || data.length === 0) return;

        const initialMetadata: Metadata = {};
        Object.keys(data[0]).forEach((attr) => {
            initialMetadata[attr] = {};
        });

        setAttributeInfo(initialMetadata);
        console.log("Initialized metadata:", attributeInfo);
    };

    const updateMetadata = (attr: any, idType: any, dType: any) => {
        console.log("IdType:", identifierType);
        console.log("DataType:", dataType);
        setAttributeInfo(prev => ({
            ...prev,
            [attr]: {
                identifierType: idType,
                dataType: dType
            }
        }));
        console.log("Updated metadata:", attributeInfo);
    };

    const handleAttributeChange = (event: { target: { value: any; }; }) => {
        if (attribute) {
            console.log('Old attribute:', attribute);
            console.log('IdType:', identifierType);
            console.log('DataType:', dataType);
            updateMetadata(attribute, identifierType, dataType);
        }

        const newAttribute = event.target.value;
        console.log('New attribute:', newAttribute);
        setAttribute(newAttribute);
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setDragActive(false);
        setSelectedFile(null);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                // @ts-ignore
                setSelectedFile(file);
            } else {
                alert('Please upload a CSV file');
            }
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                // @ts-ignore
                setSelectedFile(file);
            } else {
                alert('Please upload a CSV file');
            }
        }
    };

    const handleLoadDatabase = () => {
        if (selectedFile) {
            // In a real application, this would parse the CSV
            // @ts-ignore
            console.log('Loading database from file:', selectedFile.name);
            // setData([{ id: 1, placeholder: `Data loaded from ${selectedFile.name}` }]);
            const reader = new FileReader();
            reader.onload = function (e) {
                // @ts-ignore
                const csv = e.target.result;
                // @ts-ignore
                const parsed = Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true
                });

                // @ts-ignore
                if (parsed.errors.length) {
                    // @ts-ignore
                    alert('Error parsing CSV: ' + parsed.errors[0].message);
                    return;
                }

                // @ts-ignore
                setData(parsed.data);
                // @ts-ignore
                initMetadata(parsed.data);
                // @ts-ignore
                console.log('Data loaded:', parsed.data);
                handleCloseDialog();
            };
            reader.readAsText(selectedFile);

            handleCloseDialog();


        }
    };

    // Function to convert the JSON into an array of objects
    const handleLoadAnonymizedData = (json: string) => {
        try {
            const parsed = JSON.parse(json);
            const dataArray = JSON.parse(parsed.dataset); // convert dataset string to array
            const headers = dataArray[0];
            const rows = dataArray.slice(1);

            const result = rows.map((row: { [x: string]: any; }) => {
                let obj: { [key: string]: any } = {};
                headers.forEach((header: string | number, index: string | number) => {
                    obj[header as string] = row[index];
                });
                return obj;
            });

            setAnonymizedData(result);
        } catch (err) {
            console.error("Error processing anonymized data:", err);
        }
    };

    const handleAnonymize = () => {
        if (!areAllAttributesConfigured()) {
            console.warn("Not all attributes are configured.");
            alert("Please configure all attributes before proceeding.");
            console.log("Metadata: ", attributeInfo)
            return;
        }

        // const anonymizeNameColumn = (data) => {
        //     return data.map(row => ({
        //         ...row,
        //         Name: '*****'
        //     }));
        // };
        // setAnonymizedData(anonymizeNameColumn(data))

        // console.log("All attributes have been setup!");

        // Costruzione del metadata
        const metadata = Object.entries(attributeInfo).map(([columnName, info]) => ({
            Name: columnName,
            IDType: convertIdentifierType(info.identifierType),
            DateType: convertDataType(info.dataType),
            PK: false // puoi cambiare se prevedi di supportare PK
        }));

        // Composizione finale
        const anonymizationPayload = {
            dataset: data, // data è già un array di oggetti CSV parsato da PapaParse
            metadata: metadata
        };

        console.log("Payload for anonymization:", anonymizationPayload);

        // TODO: qui puoi inviare il payload a una API o aprire un dialog
        // sendToKgenApi(anonymizationPayload);
        // openAnonymizationDialog(anonymizationPayload);

        // Aggiungi qui apertura dialog con loader e invio a endpoint
        // @ts-ignore
        openAnonymizationDialog(anonymizationPayload);
    };

    const mergeSensitiveDataBack = (originalData: { [x: string]: any; } | null, anonymizedData: any[], metadata: any[] | undefined) => {
        if (!originalData || !anonymizedData || !metadata) return anonymizedData;

        // Trova gli attributi "sensitive"
        const sensitiveFields = metadata
            .filter(entry => entry.IDType === "s")
            .map(entry => entry.Name);

        return anonymizedData.map((anonRow, index) => {
            const originalRow = originalData[index];
            if (!originalRow) return anonRow;

            // Sostituisce solo i campi sensitive
            const mergedRow = { ...anonRow };
            sensitiveFields.forEach(field => {
                mergedRow[field] = originalRow[field];
            });

            return mergedRow;
        });
    };


    // Helper interno per convertire i tipi identificatori
    const convertIdentifierType = (type: string | undefined) => {
        switch (type) {
            case "identifier":
                return "i";
            case "quasi-identifier":
                return "qi";
            case "sensitive":
                return "s";
            default:
                return "n"; // Non-sensitive o non definito
        }
    };

    const convertDataType = (datatype: string | undefined) => {
        switch (datatype) {
            case "text":
                return "string";
            case "place":
                return "place";
            case "date":
                return "date";
            case "age":
                return "int";
            case "numeric":
                return "double";
            default:
                return "string";
        }
    };

    useEffect(() => {
        // Get new attribute's metadata
        const newAttributeMetadata = attributeInfo[attribute] || {};
        console.log('New attribute metadata:', newAttributeMetadata);

        if (Object.keys(newAttributeMetadata).length > 0) {
            setIdentifierType(newAttributeMetadata.identifierType || '');
            setDataType(newAttributeMetadata.dataType || '');
        } else {
            setIdentifierType('');
            setDataType('');
        }
        console.log('attributeInfo updated:', attributeInfo);
    }, [attributeInfo, attribute]);

    useEffect(() => {
        if (pendingAnonymize) {
            handleAnonymize();
            setPendingAnonymize(false); // reset flag
        }
    }, [attributeInfo, handleAnonymize, pendingAnonymize]);

    const rowsToShow = (showAnonymized && (anonymizedData?.length ?? 0) > 0)
        ? anonymizedData
        : (data?.length ?? 0) > 0
            ? data
            : null;

    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    return (
        <Box sx={{
            width: '100%',
            display: 'flex',
            p: 2
        }}>
            {/* Main Content and Sidebar Layout */}
            <Box sx={{ display: 'flex', width: '100%' }}>
                {/* Main Content Area */}
                <Box sx={{ flex: 1, mr: 2 }}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 500,
                            position: 'relative'
                        }}
                        elevation={2}
                    >
                        {data && anonymizedData && (
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<CloudUploadIcon />}
                                    onClick={downloadAnonymizedCSV}
                                    disabled={!anonymizedData || anonymizedData.length === 0}
                                >
                                    Download CSV
                                </Button>

                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ mr: 1 }}>
                                        Show Anonymized
                                    </Typography>
                                    <Switch
                                        checked={showAnonymized}
                                        onChange={() => setShowAnonymized(!showAnonymized)}
                                        color="primary"
                                    />
                                </Box>
                            </Box>
                        )}
                        {/* Table placeholder */}
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed #ccc',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            width: '100%',
                            p: 3
                        }}>

                            {rowsToShow ? (
                                <Box sx={{ overflow: 'auto', maxHeight: 400, width: '100%' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                        <tr>
                                            {(showAnonymized && anonymizedData?.[0] ? Object.keys(anonymizedData[0]) : data?.[0] ? Object.keys(data[0]) : []).map((key) => (
                                                <th key={key} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {((showAnonymized && anonymizedData ? anonymizedData : data) || []).map((row, index) => (
                                            <tr key={index}>
                                                {Object.values(row).map((value, i) => (
                                                    <td key={i} style={{ border: '1px solid #eee', padding: '8px' }}>
                                                        {String(value)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center' }}>
                                    <StorageIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary">
                                        No data loaded
                                    </Typography>
                                    <Typography color="text.secondary">
                                        Click &quot;Load Database&quot; to begin
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* Right Sidebar */}
                <Box sx={{ width: 250 }}>
                    {/* Load Database Button at the top */}
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<StorageIcon />}
                            onClick={handleOpenDialog}
                            size="large"
                            fullWidth
                        >
                            Load Database
                        </Button>
                    </Box>

                    {/* Configuration Card */}
                    <Card sx={{ p: 3 }} elevation={2}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'medium' }}>
                            Configuration
                        </Typography>

                        <Stack spacing={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Attribute</InputLabel>
                                <Select
                                    value={attribute}
                                    label="Attribute"
                                    onChange={handleAttributeChange}
                                    disabled={!Array.isArray(data) || data.length === 0}
                                >
                                    {(!data || !Array.isArray(data) || data.length === 0) ? (
                                        <MenuItem value="">Attribute</MenuItem>
                                    ) : (
                                        Object.keys(data[0]).map((key) => (
                                            <MenuItem key={key} value={key}>
                                                {key}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>

                            {/* Identifier Type dropdown */}
                            <FormControl fullWidth size="small">
                                <InputLabel>Identifier Type</InputLabel>
                                <Select
                                    value={identifierType}
                                    label="Identifier Type"
                                    onChange={(e) => setIdentifierType(e.target.value)}
                                >
                                    <MenuItem value="identifier">Identifier</MenuItem>
                                    <MenuItem value="quasi-identifier">Quasi Identifier</MenuItem>
                                    <MenuItem value="sensitive">Sensitive Data</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Data Type dropdown */}
                            <FormControl fullWidth size="small" disabled={identifierType !== 'quasi-identifier'}>
                                <InputLabel>Data Type</InputLabel>
                                <Select
                                    value={dataType}
                                    label="Data Type"
                                    onChange={(e) => setDataType(e.target.value)}
                                >
                                    <MenuItem value="text">Generic Text</MenuItem>
                                    <MenuItem value="place">Place</MenuItem>
                                    <MenuItem value="date">Date</MenuItem>
                                    <MenuItem value="age">Age</MenuItem>
                                    <MenuItem value="numeric">Numeric</MenuItem>
                                </Select>
                            </FormControl>

                            <Button
                                variant="contained"
                                color="secondary"
                                fullWidth
                                startIcon={<ShieldIcon />}
                                onClick={() => {
                                    updateMetadata(attribute, identifierType, dataType); // Save the current attribute data
                                    setPendingAnonymize(true);
                                    // handleAnonymize(); // Anonymize logic here
                                }}
                                disabled={!data || !attribute || !dataType || !identifierType}
                                sx={{ mt: 2 }}
                            >
                                Anonymize
                            </Button>
                        </Stack>
                    </Card>
                </Box>
            </Box>

            <Dialog open={anonymizationDialogOpen} maxWidth="sm" fullWidth>
                <DialogTitle>Anonymizing Data...</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}>
                        {loading ? (
                            <CircularProgress />
                        ) : (
                            <Typography variant="body1">Anonymization complete!</Typography>
                        )}
                    </Box>
                </DialogContent>
                {!loading && (
                    <DialogActions>
                        <Button onClick={() => setAnonymizationDialogOpen(false)}>Close</Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* CSV Upload Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Upload CSV File
                    <Button
                        size="small"
                        onClick={handleCloseDialog}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                        <CloseIcon />
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            border: dragActive ? '2px dashed #2196f3' : '2px dashed #ccc',
                            borderRadius: 1,
                            p: 3,
                            textAlign: 'center',
                            bgcolor: dragActive ? 'rgba(33, 150, 243, 0.1)' : 'background.paper',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            minHeight: 200,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('fileInput')?.click()}
                    >
                        <input
                            id="fileInput"
                            type="file"
                            accept=".csv"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileInput(e)}
                            style={{ display: 'none' }}
                        />

                        <CloudUploadIcon sx={{ fontSize: 60, color: dragActive ? 'primary.main' : 'text.secondary', mb: 2 }} />

                        {selectedFile ? (
                            <Typography variant="body1" color="primary">
                                Selected file: {(selectedFile as File).name}
                            </Typography>
                        ) : (
                            <>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Drag & Drop a CSV file here
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    or click to browse files
                                </Typography>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={handleCloseDialog} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLoadDatabase}
                        variant="contained"
                        disabled={!selectedFile}
                        startIcon={<StorageIcon />}
                    >
                        Load Database
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}