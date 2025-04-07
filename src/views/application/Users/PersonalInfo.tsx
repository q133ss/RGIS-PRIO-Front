import React, { useState, useEffect } from "react";
import { Button, Card, Col, Form, Row, Alert, Container, Spinner } from "react-bootstrap";
import {
    BsPersonLinesFill, BsKeyFill, BsPerson, BsTelephone, BsPersonBadge,
    BsLockFill, BsSaveFill, BsXCircle, BsHash, BsClockHistory, BsBuilding,
    BsPersonGear, BsCheckCircleFill, BsExclamationTriangleFill, 
    BsStars, 
    BsInfoCircle, 
    BsFileEarmarkPerson 
} from 'react-icons/bs';
import { getCurrentUser, getToken } from "../../../services/auth";
import { api } from "../../../services/api";
import InputMask from "react-input-mask";

interface UserProfile {
    id: number;
    first_name: string;
    last_name: string;
    middle_name: string;
    login: string;
    phone: string;
    org_id?: number;
    created_at?: string;
    updated_at?: string;
    roles?: Array<{
        id: number;
        name: string;
        slug: string;
    }>;
    org?: {
        id: number;
        fullName: string;
        shortName: string;
        inn: string;
    };
}

interface FormData {
    first_name: string;
    last_name: string;
    middle_name: string;
    login: string;
    phone: string;
    password?: string;
    password_confirmation?: string;
}

const styles = {
    iconMargin: {
        marginRight: '10px',
        verticalAlign: 'middle',
    },
    inlineIcon: {
        marginRight: '6px',
        verticalAlign: 'text-bottom',
        fontSize: '1.1em',
    },
    highlightIcon: {
        color: '#007bff',
        marginRight: '8px',
        verticalAlign: 'middle',
    }
};

const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
};

const PersonalInfo = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [formData, setFormData] = useState<FormData>({
        first_name: "", last_name: "", middle_name: "", login: "", phone: "",
        password: "", password_confirmation: ""
    });

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                try {
                    const response = await api.get<UserProfile>('/me');
                    setUserData(response);
                    setFormData({
                        first_name: response.first_name || "", last_name: response.last_name || "",
                        middle_name: response.middle_name || "", login: response.login || "",
                        phone: response.phone || "", password: "", password_confirmation: ""
                    });
                } catch (apiErr: any) {
                    const currentUser = getCurrentUser();
                    if (currentUser) {
                        setUserData(currentUser);
                         setFormData({
                            first_name: currentUser.first_name || "", last_name: currentUser.last_name || "",
                            middle_name: currentUser.middle_name || "", login: currentUser.login || "",
                            phone: currentUser.phone || "", password: "", password_confirmation: ""
                        });
                    } else {
                        throw new Error("Не удалось получить данные пользователя ни из API, ни из localStorage.");
                    }
                }
            } catch (err: any) {
                setError(err.message || "Не удалось загрузить данные профиля. Пожалуйста, обновите страницу.");
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const updatedErrors = { ...prev };
                delete updatedErrors[name];
                return updatedErrors;
            });
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData((prev) => ({ ...prev, phone: value }));
        if (validationErrors.phone) {
            setValidationErrors(prev => {
                const updatedErrors = { ...prev };
                delete updatedErrors.phone;
                return updatedErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setValidationErrors({});
            setError(null);
            setSuccess(null);

            const payload: any = {
                first_name: formData.first_name, last_name: formData.last_name,
                middle_name: formData.middle_name, login: formData.login,
                phone: formData.phone,
            };

            if (formData.password && formData.password.trim() !== "") {
                payload.password = formData.password;
                payload.password_confirmation = formData.password_confirmation;
            }

            const token = getToken();
            if (!token) throw new Error("Не авторизован");

            const API_URL = import.meta.env.VITE_API_URL || 'https://pink-masters.store/api';
            const response = await fetch(`${API_URL}/me`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                data = await response.json();
            } else {
                const textResponse = await response.text();
                if (!response.ok) throw new Error(`Ошибка сервера: ${response.status} - ${textResponse || response.statusText}`);
                data = { message: "Профиль успешно обновлен (ответ не JSON)" };
            }

            if (!response.ok) {
                if (response.status === 422 && data?.errors) {
                    setValidationErrors(data.errors);
                    setError("Пожалуйста, исправьте ошибки в форме.");
                    return;
                }
                throw new Error(data?.message || `Ошибка сервера: ${response.status}`);
            }

            setSuccess(data.message || "Профиль успешно обновлен");

            try {
                const updatedUserResponse = await api.get<UserProfile>('/me');
                localStorage.setItem('user', JSON.stringify(updatedUserResponse));
                setUserData(updatedUserResponse);
                 setFormData({
                    first_name: updatedUserResponse.first_name || "", last_name: updatedUserResponse.last_name || "",
                    middle_name: updatedUserResponse.middle_name || "", login: updatedUserResponse.login || "",
                    phone: updatedUserResponse.phone || "", password: "", password_confirmation: ""
                });
            } catch (fetchErr) {
                setFormData((prev) => ({ ...prev, password: "", password_confirmation: "" }));
            }

        } catch (err: any) {
            setError(err.message || "Не удалось обновить профиль. Пожалуйста, попробуйте еще раз.");
        } finally {
            setSaving(false);
            if (success) {
                setTimeout(() => setSuccess(null), 5000);
            }
        }
    };

    return (
        <Container fluid="lg" className="py-4 px-sm-3 px-md-4">
            <h1 className="mb-4 d-flex align-items-center">
                <BsFileEarmarkPerson style={styles.iconMargin} size={32} /> Личный кабинет 
                <BsStars style={{...styles.highlightIcon, marginLeft: '10px'}} size={24} />
            </h1>

            <Card className="shadow-sm">
                <Card.Header className="d-flex align-items-center bg-light">
                    <Card.Title as="h5" className="mb-0 flex-grow-1">
                         <BsPersonLinesFill style={styles.iconMargin} size={20} /> Персональная информация
                         <BsInfoCircle style={{...styles.highlightIcon, marginLeft: '10px'}} size={18} />
                    </Card.Title>
                 </Card.Header>

                <Card.Body className="p-4">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="primary" className="me-2" />
                            <span>Загрузка данных профиля...</span>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <Alert variant="danger" dismissible onClose={() => setError(null)} className="d-flex align-items-center">
                                    <BsExclamationTriangleFill style={styles.inlineIcon} className="me-2" />
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="d-flex align-items-center">
                                    <BsCheckCircleFill style={styles.inlineIcon} className="me-2"/>
                                    {success}
                                </Alert>
                            )}

                            {!userData && !loading ? (
                                <Alert variant="warning" className="d-flex align-items-center">
                                    <BsExclamationTriangleFill style={styles.inlineIcon} className="me-2"/>
                                    Не удалось загрузить данные пользователя.
                                </Alert>
                            ) : userData && (
                                <Form onSubmit={handleSubmit} noValidate>
                                    <div className="mb-4 p-3 border rounded bg-light">
                                        <h6 className="mb-3 text-muted d-flex align-items-center">
                                            <BsStars style={styles.inlineIcon} /> Дополнительная информация
                                        </h6>
                                        <Row className="g-2">
                                            <Col xs={12} sm={6} lg={4}>
                                                <small className="text-muted d-block"><BsHash style={styles.inlineIcon} /> <strong>ID:</strong> {userData.id}</small>
                                            </Col>
                                            {userData.created_at && (
                                                <Col xs={12} sm={6} lg={4}>
                                                    <small className="text-muted d-block"><BsClockHistory style={styles.inlineIcon} /> <strong>Регистрация:</strong> {formatDate(userData.created_at)}</small>
                                                </Col>
                                            )}
                                            {userData.updated_at && (
                                                <Col xs={12} sm={6} lg={4}>
                                                    <small className="text-muted d-block"><BsClockHistory style={styles.inlineIcon} /> <strong>Обновлено:</strong> {formatDate(userData.updated_at)}</small>
                                                </Col>
                                            )}
                                            {userData.org && (
                                                <Col xs={12} sm={6} lg={4}>
                                                    <small className="text-muted d-block"><BsBuilding style={styles.inlineIcon} /> <strong>Организация:</strong> {userData.org.shortName}</small>
                                                </Col>
                                            )}
                                            {userData.roles?.[0] && (
                                                <Col xs={12} sm={6} lg={4}>
                                                    <small className="text-muted d-block"><BsPersonGear style={styles.inlineIcon} /> <strong>Роль:</strong> {userData.roles[0].name}</small>
                                                </Col>
                                            )}
                                        </Row>
                                    </div>

                                    <Row className="mb-3">
                                        <Form.Group as={Col} md={6} controlId="formFirstName" className="mb-3 mb-md-0">
                                            <Form.Label><BsPerson style={styles.inlineIcon} /> Имя <span className="text-danger">*</span></Form.Label>
                                            <Form.Control type="text" name="first_name" value={formData.first_name} onChange={handleChange} isInvalid={!!validationErrors.first_name} required />
                                            <Form.Control.Feedback type="invalid">{validationErrors.first_name?.[0]}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Form.Group as={Col} md={6} controlId="formLastName">
                                            <Form.Label><BsPerson style={styles.inlineIcon} /> Фамилия <span className="text-danger">*</span></Form.Label>
                                            <Form.Control type="text" name="last_name" value={formData.last_name} onChange={handleChange} isInvalid={!!validationErrors.last_name} required />
                                            <Form.Control.Feedback type="invalid">{validationErrors.last_name?.[0]}</Form.Control.Feedback>
                                        </Form.Group>
                                    </Row>
                                     <Row className="mb-3">
                                        <Form.Group as={Col} md={6} controlId="formMiddleName" className="mb-3 mb-md-0">
                                            <Form.Label><BsPerson style={styles.inlineIcon} /> Отчество</Form.Label>
                                            <Form.Control type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} isInvalid={!!validationErrors.middle_name} />
                                            <Form.Control.Feedback type="invalid">{validationErrors.middle_name?.[0]}</Form.Control.Feedback>
                                        </Form.Group>
                                         <Form.Group as={Col} md={6} controlId="formLogin">
                                            <Form.Label><BsPersonBadge style={styles.inlineIcon} /> Логин <span className="text-danger">*</span></Form.Label>
                                            <Form.Control type="text" name="login" value={formData.login} onChange={handleChange} isInvalid={!!validationErrors.login} required />
                                            <Form.Control.Feedback type="invalid">{validationErrors.login?.[0]}</Form.Control.Feedback>
                                        </Form.Group>
                                    </Row>
                                    <Row className="mb-4">
                                         <Form.Group as={Col} md={6} controlId="formPhone">
                                            <Form.Label><BsTelephone style={styles.inlineIcon} /> Телефон <span className="text-danger">*</span></Form.Label>
                                            <InputMask
                                                mask="+7(999)999-99-99"
                                                value={formData.phone}
                                                onChange={handlePhoneChange}
                                                name="phone"
                                                alwaysShowMask={true}
                                            >
                                                {(inputProps: any) => (
                                                    <Form.Control 
                                                        {...inputProps}
                                                        type="text"
                                                        isInvalid={!!validationErrors.phone}
                                                        required
                                                    />
                                                )}
                                            </InputMask>
                                            <Form.Control.Feedback type="invalid">{validationErrors.phone?.[0]}</Form.Control.Feedback>
                                            <Form.Text muted>Формат: +7(XXX)XXX-XX-XX</Form.Text>
                                        </Form.Group>
                                    </Row>

                                    <Card className="mt-4 mb-4 shadow-sm">
                                        <Card.Header className="d-flex align-items-center bg-light">
                                            <Card.Title as="h6" className="mb-0 flex-grow-1">
                                                 <BsKeyFill style={styles.iconMargin} size={18} /> Изменить пароль
                                             </Card.Title>
                                        </Card.Header>
                                        <Card.Body className="p-4">
                                            <Row>
                                                <Form.Group as={Col} md={6} controlId="formPassword" className="mb-3 mb-md-0">
                                                    <Form.Label><BsLockFill style={styles.inlineIcon} /> Новый пароль</Form.Label>
                                                    <Form.Control type="password" name="password" value={formData.password || ''} onChange={handleChange} isInvalid={!!validationErrors.password} aria-describedby="passwordHelpBlock" />
                                                    <Form.Control.Feedback type="invalid">{validationErrors.password?.[0]}</Form.Control.Feedback>
                                                    <Form.Text id="passwordHelpBlock" muted>Оставьте пустым, если не хотите менять.</Form.Text>
                                                </Form.Group>
                                                <Form.Group as={Col} md={6} controlId="formPasswordConfirmation">
                                                    <Form.Label><BsLockFill style={styles.inlineIcon} /> Подтверждение пароля</Form.Label>
                                                    <Form.Control type="password" name="password_confirmation" value={formData.password_confirmation || ''} onChange={handleChange} isInvalid={!!validationErrors.password || !!validationErrors.password_confirmation} required={!!formData.password} />
                                                    {validationErrors.password_confirmation && <Form.Control.Feedback type="invalid">{validationErrors.password_confirmation?.[0]}</Form.Control.Feedback>}
                                                    {validationErrors.password && !validationErrors.password_confirmation && <Form.Control.Feedback type="invalid">{validationErrors.password?.[0]}</Form.Control.Feedback>}
                                                </Form.Group>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    <div className="d-flex justify-content-end gap-2">
                                        <Button variant="outline-secondary" type="button" onClick={() => window.history.back()}>
                                            <BsXCircle style={styles.inlineIcon} /> Отмена
                                        </Button>
                                        <Button variant="primary" type="submit" disabled={saving}>
                                            {saving ? (
                                                <>
                                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={styles.inlineIcon} />
                                                    Сохранение...
                                                </>
                                            ) : (
                                                <>
                                                    <BsSaveFill style={styles.inlineIcon} /> Обновить профиль
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}

export default PersonalInfo;