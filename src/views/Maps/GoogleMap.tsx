import { GoogleApiWrapper, Map } from 'google-maps-react';
import React, { useRef } from 'react'
import { Card, Col, Row } from 'react-bootstrap'

const mapStyles = {
    width: '518px',
    height: '400px',
};
const LoadingContainer = () => <div>Loading...</div>

const GoogleMap = (props: any) => {
    const map1Ref = useRef(null);
    const map2Ref = useRef(null);
    const map3Ref = useRef(null);
    const map4Ref = useRef(null);
    return (
        <React.Fragment>
            <Row>
                <Col md={6} sm={12}>
                    <Card>
                        <Card.Header>
                            <h5>Markers</h5>
                        </Card.Header>
                        <Card.Body>
                            <div id="world-map-markers" className="set-map jvm-container" style={{ height: " 400px", backgroundColor: "transparent" }}>
                                <Map
                                    ref={map1Ref}
                                    google={props.google}
                                    // zoom={8}
                                    style={mapStyles}
                                    initialCenter={{ lat: 34.134117, lng: -118.321495 }}
                                />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} sm={12}>
                    <Card>
                        <Card.Header>
                            <h5>Overlays</h5>
                        </Card.Header>
                        <Card.Body >
                            <div id="world-map-markers" className="set-map jvm-container" style={{ height: " 400px", backgroundColor: "transparent" }}>
                                <Map
                                    ref={map2Ref}
                                    google={props.google}
                                    // zoom={8}
                                    style={mapStyles}
                                    initialCenter={{ lat: 54.5260, lng: 15.2551 }}
                                />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Row>
                <Col md={6} sm={12}>
                    <Card >
                        <Card.Header>
                            <h5>Street View Panoramas</h5>
                        </Card.Header>
                        <Card.Body>
                            <div id="world-map-markers" className="set-map jvm-container" style={{ height: " 400px", backgroundColor: "transparent" }}>
                                <Map
                                    ref={map3Ref}
                                    google={props.google}
                                    // zoom={8}
                                    style={mapStyles}
                                    initialCenter={{ lat: 8.7832, lng: 34.5085 }}
                                />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} sm={12}>
                    <Card>
                        <Card.Header>
                            <h5>Map Types</h5>
                        </Card.Header>

                        <div className="card-body">
                            <div id="world-map-markers" className="set-map jvm-container" style={{ height: " 400px", backgroundColor: "transparent" }}>
                                <Map
                                    ref={map4Ref}
                                    google={props.google}
                                    // zoom={8}
                                    style={mapStyles}
                                    initialCenter={{ lat: 19.0760, lng: 72.8777 }}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </React.Fragment>
    )
}
export default (
    GoogleApiWrapper({
        apiKey: "AIzaSyAbvyBxmMbFhrzP9Z8moyYr6dCr-pzjhBE",
        LoadingContainer: LoadingContainer,
    })(GoogleMap)
)